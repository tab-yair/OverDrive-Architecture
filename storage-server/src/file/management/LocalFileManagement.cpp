#include "LocalFileManagement.h"
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <cstdlib>

using namespace std;
namespace fs = std::filesystem;

// --------------------
// Constructor with explicit basePath
// --------------------
LocalFileManagement::LocalFileManagement(
    std::unique_ptr<IFileStorage> storage,
    const std::filesystem::path& basePath)
    : storage(std::move(storage)),
      basePath(basePath)
{
    // Create base directory if it doesn't exist
    fs::create_directories(basePath);
}

// --------------------
// Constructor using OVERDRIVE_PATH environment variable
// Throws if env var is missing
// --------------------
LocalFileManagement::LocalFileManagement(std::unique_ptr<IFileStorage> storage)
    : storage(std::move(storage))
{
    const char* basePathEnv = std::getenv("OVERDRIVE_PATH");
    if (!basePathEnv) {
        throw std::runtime_error("Environment variable OVERDRIVE_PATH not set");
    }

    basePath = fs::path(basePathEnv);
    fs::create_directories(basePath);
}

// --------------------
// Security validation against path traversal attacks
// Allows subdirectories but blocks ".." patterns that could escape basePath
// --------------------
void LocalFileManagement::validateFileName(const std::string& fileName) const {
     if (fileName.empty()) {
        throw std::invalid_argument("File name cannot be empty");
    }

    // Prevent path separators - no subdirectories allowed
    if (fileName.find('/') != std::string::npos || fileName.find('\\') != std::string::npos) {
        throw std::invalid_argument("File name cannot contain path separators (no subdirectories allowed)");
    }
}

// --------------------
// Builds full filesystem path from basePath and fileName
// --------------------
std::filesystem::path LocalFileManagement::buildFullPath(const std::string& fileName) const {
    return basePath / fileName;
}

// --------------------
// Create a new file with optional content
// --------------------
void LocalFileManagement::create(const std::string& fileName, const std::string& content) {
    validateFileName(fileName);
    
    if (exists(fileName)) {
        throw runtime_error("File already exists: " + fileName);
    }
    
    auto fullPath = buildFullPath(fileName);
    
    // Create parent directories if needed
    if (fullPath.has_parent_path()) {
        fs::create_directories(fullPath.parent_path());
    }
    
    storage->writeFile(fullPath, content);
}

// --------------------
// Write to an existing file
// --------------------
void LocalFileManagement::write(const std::string& fileName, const std::string &content) {
    validateFileName(fileName);
    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }
    
    storage->writeFile(buildFullPath(fileName), content);
}

// --------------------
// Read file content (decompressed)
// --------------------
std::string LocalFileManagement::read(const std::string& fileName) {
    validateFileName(fileName);
    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }
    
    return storage->readFile(buildFullPath(fileName));
}

// --------------------
// Remove a file
// --------------------
void LocalFileManagement::remove(const std::string& fileName) {
    validateFileName(fileName);
    
    if (!exists(fileName)) {
        throw runtime_error("File does not exist: " + fileName);
    }
    
    storage->deleteFile(buildFullPath(fileName));
}

// --------------------
// Check if file exists
// --------------------
bool LocalFileManagement::exists(const std::string& fileName) {
    try {
        validateFileName(fileName);
        return fs::exists(buildFullPath(fileName));
    } catch (const std::invalid_argument&) {
        return false; // Invalid file names are considered non-existent
    }
}

// --------------------
// List all files in base directory (non-recursive)
// --------------------
std::vector<std::string> LocalFileManagement::list() {
    vector<std::string> fileList;
    
    if (!fs::exists(basePath)) {
        return fileList;
    }
    
    for (const auto& entry : fs::directory_iterator(basePath)) {
        if (entry.is_regular_file()) {
            fileList.push_back(entry.path().filename().string());
        }
    }
    
    return fileList;
}

// Search for files containing the specified content substring or this is in theie name ( even if the file dont own by the user)
std::vector<std::string> LocalFileManagement::search(const std::string& userID, const std::string& content) {
    std::vector<std::string> results;
    // if content.empty() return empty results
    if (content.empty()) {
        return results;
    }

    auto allMetadata = metadataStore->list();
    for (const auto& [key, metadata] : allMetadata) {
        if (metadata.logicalName.find(content) != std::string::npos) {
            results.push_back(metadata.logicalName);
        } else {
            // Read file content to check for substring
            auto physicalPath = pathMapper->resolve(metadata.logicalName);
            try {
                std::string fileContent = storage->readFile(physicalPath);
                if (fileContent.find(content) != std::string::npos) {
                    results.push_back(metadata.logicalName);
                }
            } catch (...) {
                throw std::runtime_error("Failed to read file during search: " + metadata.logicalName);
            }
        }
    }
    return results;
}