#include "file/LocalFileManagement.h"
#include <fstream>
#include <sstream>
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

// Validates fileName against path traversal attacks
// Allows subdirectories but blocks ".." patterns that could escape basePath
void LocalFileManagement::validateFileName(const std::string& fileName) const {
    if (fileName.empty()) {
        throw std::invalid_argument("File name cannot be empty");
    }
    // Prevent absolute paths 
    if (fileName[0] == '/') {
        throw std::invalid_argument("Absolute paths are not allowed");
    }
    // Prevent path traversal
    if (fileName == "." || fileName == "..") {
        throw std::invalid_argument("Invalid file name");
    }
    // Prevent path traversal starting with "../"
    if (fileName.rfind("../", 0) == 0) {
        throw std::invalid_argument("Invalid file name: path traversal detected");
    }
    
    // Check for "/.." in middle of path
    for (size_t pos = 0; (pos = fileName.find("/..", pos)) != std::string::npos; pos += 3) {
        size_t nextCharIndex = pos + 3;
        if (nextCharIndex == fileName.size() || fileName[nextCharIndex] == '/') {
            throw std::invalid_argument("Invalid file name: path traversal detected");
        }
    }
}
// Builds full filesystem path from basePath and fileName
std::filesystem::path LocalFileManagement::buildFullPath(const std::string& fileName) const {
    return fs::path(basePath) / fileName;
}

// Compresses and writes content to disk
void LocalFileManagement::writeInternal(const std::filesystem::path& filePath, const std::string &content) {
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }

    ofstream out(filePath, ios::binary);
    if (!out) {
        throw runtime_error("Failed to open file for writing: " + filePath.string());
    }
    
    std::string compressed = compressor->compress(content);
    out << compressed;
    
    if (!out) {
        throw runtime_error("Failed to write to file: " + filePath.string());
    }
}

void LocalFileManagement::create(const std::string& fileName, const std::string &content) {
    validateFileName(fileName);
    
    if (exists(fileName)) {
        throw runtime_error("File already exists: " + fileName);
    }
    
    writeInternal(buildFullPath(fileName), content);
}

void LocalFileManagement::write(const std::string& fileName, const std::string &content) {
    validateFileName(fileName);
    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }
    
    writeInternal(buildFullPath(fileName), content);
}

std::string LocalFileManagement::read(const std::string& fileName) {
    validateFileName(fileName);
    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }    
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }
    
    ifstream in(buildFullPath(fileName), ios::binary);
    if (!in) {
        throw runtime_error("Failed to open file for reading: " + fileName);
    }
    
    stringstream buffer;
    buffer << in.rdbuf();
    return compressor->decompress(buffer.str());
}

void LocalFileManagement::remove(const std::string& fileName) {
    validateFileName(fileName);
    fs::remove(buildFullPath(fileName));  
}

bool LocalFileManagement::exists(const std::string& fileName) {
    try {
        validateFileName(fileName);
        return fs::exists(buildFullPath(fileName));
    } catch (const std::invalid_argument&) {
        return false;
    }
}

std::vector<std::string> LocalFileManagement::fileList() {
    vector<std::string> files;
    for (const auto& entry : fs::directory_iterator(basePath)) {
        if (entry.is_regular_file())
            files.push_back(entry.path().filename().string());
    }
    return files;
}

std::vector<std::string> LocalFileManagement::searchContent(const std::string& content) {
    vector<std::string> result;
    
    if (content.empty()) {
        return result;
    }
    
    for (const auto& file : fileList()) {
        if (read(file).find(content) != string::npos)
            result.push_back(file);
    }
    return result;
}
