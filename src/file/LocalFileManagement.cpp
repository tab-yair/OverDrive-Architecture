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
void LocalFileManagement::write(const std::string& fileName, const std::string &content) {
    // throw on errors if fileName empty or compressor missing
    if (fileName.empty()) {
        throw invalid_argument("File name cannot be empty");
    }
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }

    // Open file for writing
    ofstream out(fullPath(fileName), ios::binary);
    if (!out) {
        throw runtime_error("Failed to open file for writing: " + fileName);
    }
    // Compress content and write
    std::string compressed = compressor->compress(content);  // Can throw
    out << compressed;
    
    if (!out) {
        throw runtime_error("Failed to write to file: " + fileName);
    }
}

// Read entire file content, throws std::runtime_error if file missing
std::string LocalFileManagement::read(const std::string& fileName) {
    // throw on errors if fileName empty, not exists or compressor missing
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

// Delete file
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
