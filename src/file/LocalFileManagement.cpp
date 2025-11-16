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
// Sets base directory from OVERDRIVE_PATH environment variable.
// Ensures directory exists. Throws if env var is missing.
// --------------------
LocalFileManagement::LocalFileManagement(std::unique_ptr<ICompressor> comp)
    : compressor(std::move(comp)) 
{
    const char* basePathEnv = std::getenv("OVERDRIVE_PATH");
    if (!basePathEnv) {
        throw std::runtime_error("Environment variable OVERDRIVE_PATH not set");
    }

    basePath = fs::path(basePathEnv);
    fs::create_directories(basePath); // create directory if it doesn't exist
}

// --------------------
// Helper: full path
// Joins basePath with fileName (cross-platform safe)
// --------------------
std::filesystem::path LocalFileManagement::fullPath(const std::string& fileName) const {
    return fs::path(basePath) / fileName;
}

// --------------------
// Basic file operations
// --------------------

// Write content to file (overwrites if exists)
bool LocalFileManagement::write(const std::string& fileName, const std::string &content) {
    if (fileName.empty()) return false;

    try {
        ofstream out(fullPath(fileName), ios::binary);
        out << content;
        return true;
    } catch (...) {
        return false; // return false on any error
    }
}

// Read entire file content, returns empty string if file missing
std::string LocalFileManagement::read(const std::string& fileName) {
    if (fileName.empty() || !exists(fileName)) return "";

    ifstream in(fullPath(fileName), ios::binary);
    stringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

// Delete file, returns true if successful
bool LocalFileManagement::remove(const std::string& fileName) {
    if (fileName.empty()) return false;

    try {
        return fs::remove(fullPath(fileName));
    } catch (...) {
        return false;
    }
}

// Check if file exists
bool LocalFileManagement::exists(const std::string& fileName) {
    if (fileName.empty()) return false;
    return fs::exists(fullPath(fileName));
}

// List all files in base directory (non-recursive)
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
// Requires compressor to be set
// --------------------

// Compress content and write to file
bool LocalFileManagement::writeCompressed(const std::string& fileName,
                                          const std::string& content) {
    if (!compressor) throw runtime_error("Compressor not set");
    return write(fileName, compressor->compress(content));
}

// Read file and decompress content
std::string LocalFileManagement::readDecompressed(const std::string& fileName) {
    if (!compressor) throw runtime_error("Compressor not set");
    return compressor->decompress(read(fileName));
}

// Search files containing a specific substring
std::vector<std::string> LocalFileManagement::searchContent(const std::string& content) {
    vector<std::string> result;
    for (const auto& file : fileList()) {
        if (readDecompressed(file).find(content) != string::npos)
            result.push_back(file);
    }
    return result;
}
