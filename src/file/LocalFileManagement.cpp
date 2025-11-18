#include "LocalFileManagement.h"
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

// --------------------
// Helper: full path
// Joins basePath with fileName and validates against path traversal attacks
// Allows subdirectories but blocks ".." patterns that could escape basePath
// Throws invalid_argument if fileName attempts path traversal
// --------------------
std::filesystem::path LocalFileManagement::fullPath(const std::string& fileName) const {
    // Validate using simple string operations
    if (fileName.empty()) {
        throw std::invalid_argument("File name cannot be empty");
    }
    

    // Reject absolute paths (starting with '/')
    if (fileName[0] == '/') {
        throw std::invalid_argument("Absolute paths are not allowed");
    }
    
    // Reject "." and ".."
    if (fileName == "." || fileName == "..") {
        throw std::invalid_argument("Invalid file name");
    }
    
    // Leading parent traversal: "../..."
    if (fileName.rfind("../", 0) == 0) {
        throw std::invalid_argument("Invalid file name: path traversal detected");
    }
    
    // Any "/.." segment that is followed by '/' or end-of-string indicates upward traversal
    for (size_t pos = 0; (pos = fileName.find("/..", pos)) != std::string::npos; pos += 3) {
        // nextCharIndex is first character after "/.."
        size_t nextCharIndex = pos + 3;
        if (nextCharIndex == fileName.size() || fileName[nextCharIndex] == '/') {
            throw std::invalid_argument("Invalid file name: path traversal detected");
        }
    }
    
    // Construct full path (allows subdirectories)
    return fs::path(basePath) / fileName;
}

// --------------------
// Helper functions
// --------------------

// Internal helper - performs actual file writing to physical path
// Receives full validated path, compresses content and writes to disk
void LocalFileManagement::writeInternal(const std::filesystem::path& filePath, const std::string &content) {
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }

    // Open file for writing
    ofstream out(filePath, ios::binary);
    if (!out) {
        throw runtime_error("Failed to open file for writing: " + filePath.string());
    }
    
    // Compress content and write
    std::string compressed = compressor->compress(content);  // Can throw
    out << compressed;
    
    if (!out) {
        throw runtime_error("Failed to write to file: " + filePath.string());
    }
}

// --------------------
// Basic file operations
// --------------------

// Create file with content (fails if file exists)
void LocalFileManagement::create(const std::string& fileName, const std::string &content) {
    if (fileName.empty()) {
        throw invalid_argument("File name cannot be empty");
    }
    if (exists(fileName)) {
        throw runtime_error("File already exists: " + fileName);
    }
    
    // Get full path and use internal helper to write
    writeInternal(fullPath(fileName), content);
}

// Write content to file (overwrites if exists, fails if doesn't exist)
void LocalFileManagement::write(const std::string& fileName, const std::string &content) {
    if (fileName.empty()) {
        throw invalid_argument("File name cannot be empty");
    }
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }
    
    // Get full path and use internal helper to write
    writeInternal(fullPath(fileName), content);
}

// Read entire file content and decompress
// Throws exception if fileName is empty, file doesn't exist, compressor not set, or I/O fails
std::string LocalFileManagement::read(const std::string& fileName) {
    if (fileName.empty()) {
        throw invalid_argument("File name cannot be empty");
    }    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }    
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }
    // Open file for reading
    ifstream in(fullPath(fileName), ios::binary);
    if (!in) {
        throw runtime_error("Failed to open file for reading: " + fileName);
    }
    // Read entire file into string
    stringstream buffer;
    buffer << in.rdbuf();
    // Decompress and return
    return compressor->decompress(buffer.str());  // Can throw
}

// Delete file (idempotent - safe to call even if file doesn't exist)
// Throws exception only on real errors (permission denied, etc.)
void LocalFileManagement::remove(const std::string& fileName) {
    if (fileName.empty()) {
        throw invalid_argument("File name cannot be empty");
    }
    
    fs::remove(fullPath(fileName));  
    
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

// Search files containing a specific substring
std::vector<std::string> LocalFileManagement::searchContent(const std::string& content) {
    vector<std::string> result;
    for (const auto& file : fileList()) {
        if (read(file).find(content) != string::npos)
            result.push_back(file);
    }
    return result;
}
