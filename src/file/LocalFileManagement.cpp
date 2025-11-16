#include "LocalFileManagement.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iterator>
#include <filesystem>
#include <stdexcept>

using namespace std;
namespace fs = std::filesystem;

// --------------------
// Constructor
// --------------------
LocalFileManagement::LocalFileManagement(std::unique_ptr<ICompressor> comp)
    : compressor(std::move(comp)) 
{
    const char* basePathEnv = std::getenv("OVERDRIVE_PATH");
    if (!basePathEnv) {
        throw std::runtime_error("Environment variable OVERDRIVE_PATH not set");
    }

    basePath = fs::path(basePathEnv);

    fs::create_directories(basePath);
}

// --------------------
// Helper: full path
// --------------------
std::filesystem::path LocalFileManagement::fullPath(const std::string& fileName) const {
    return (fs::path(basePath) / fileName).string();
}

// --------------------
// Basic file operations
// --------------------
bool LocalFileManagement::write(const std::string& fileName, const std::string &content) {
     if (fileName.empty()) {
        return false;
    }
                                    
    try {
        ofstream out(fullPath(fileName), ios::binary);
        out << content;
        return true;
    } catch (...) {
        return false;
    }
}

std::string LocalFileManagement::read(const std::string& fileName) {
     if (fileName.empty()) {
        return "";
    }

    if (!exists(fileName)) return "";

    ifstream in(fullPath(fileName), ios::binary);
    stringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

bool LocalFileManagement::remove(const std::string& fileName) {
     if (fileName.empty()) {
        return false;
    }

    try {
        return fs::remove(fullPath(fileName));
    } catch (...) {
        return false;
    }
}

bool LocalFileManagement::exists(const std::string& fileName) {
     if (fileName.empty()) {
        return false;
    }
    
    return fs::exists(fullPath(fileName));
}


// List all files in base directory (not recursive)
std::vector<std::string> LocalFileManagement::fileList() {
    vector<std::string> files;
    for (const auto& entry : fs::directory_iterator(basePath)) {
        if (entry.is_regular_file())
            files.push_back(entry.path().filename().string());
    }
    return files;
}

// --------------------
// Compression helpers
// --------------------
bool LocalFileManagement::writeCompressed(const std::string& fileName,
                                          const std::string& content) {
    if (!compressor) throw runtime_error("Compressor not set");
    string compressed = compressor->compress(content);
    return write(fileName, compressed);
}

std::string LocalFileManagement::readDecompressed(const std::string& fileName) {
    if (!compressor) throw runtime_error("Compressor not set");
    string compressed = read(fileName);
    return compressor->decompress(compressed);
}

std::vector<std::string> LocalFileManagement::searchContent(const std::string& content) {
    vector<std::string> result;
    for (const auto& file : fileList()) {
        string data = readDecompressed(file);
        if (data.find(content) != string::npos)
            result.push_back(file);
    }
    return result;
}