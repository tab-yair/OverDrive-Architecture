#include "LocalFileManagement.h"
#include "file/path/IPathMapper.h"
#include "file/storage/IFileStorage.h"
#include "file/metadata/IMetadataStore.h"
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <ctime>

// Helper function to convert time_t to string
static std::string timeToString(std::time_t t) {
    return std::to_string(t);
}

// Constructor
LocalFileManagement::LocalFileManagement(
    std::unique_ptr<IPathMapper> pathMapper,
    std::unique_ptr<IFileStorage> storage,
    std::unique_ptr<IMetadataStore> metadataStore)
    : pathMapper(std::move(pathMapper)),
      storage(std::move(storage)),
      metadataStore(std::move(metadataStore))
{
}

// Create a new file
void LocalFileManagement::create(const std::string& userID, const std::string& fileName, const std::string& content) {
    if (exists(userID, fileName)) {
        throw std::runtime_error("File already exists: " + fileName);
    }

    auto physicalPath = pathMapper->resolve(fileName);
    storage->writeFile(physicalPath, content);

    // Build metadata object
    std::time_t now = std::time(nullptr);
    std::string nowStr = timeToString(now);
    FileMetaData metadata;
    metadata.ownerId = userID;
    metadata.logicalName = fileName;
    metadata.physicalPath = physicalPath;
    metadata.fileSize = content.size();
    metadata.createdAt = nowStr;
    metadata.modifiedAt = nowStr;
    metadata.accessedAt = nowStr;

    metadataStore->save(fileName, metadata);
}

// Write to an existing file
void LocalFileManagement::write(const std::string& userID, const std::string& fileName, const std::string &content) {
    // Check existence
    if (!exists(userID, fileName)) {
        throw std::runtime_error("File does not exist: " + fileName);
    }
    // Update content
    auto physicalPath = pathMapper->resolve(fileName);
    storage->writeFile(physicalPath, content);
    // Update metadata
    auto metadataOpt = metadataStore->load(fileName);
    if (!metadataOpt) {
        throw std::runtime_error("Metadata missing for file: " + fileName);
    }
    FileMetaData metadata = *metadataOpt;
    metadata.fileSize = content.size();
    std::string nowStr = timeToString(std::time(nullptr));
    metadata.modifiedAt = nowStr;
    metadata.accessedAt = nowStr;
    metadataStore->save(fileName, metadata);
}

// Read file content
std::string LocalFileManagement::read(const std::string& userID, const std::string& fileName) {
    // Check existence
    if (!exists(userID, fileName)) {
        throw std::runtime_error("File does not exist: " + fileName);
    }
    // Read content
    auto physicalPath = pathMapper->resolve(fileName);
    std::string content = storage->readFile(physicalPath);

    // Update metadata
    auto metadataOpt = metadataStore->load(fileName);
    if (metadataOpt) {
        FileMetaData metadata = *metadataOpt;
        metadata.accessedAt = timeToString(std::time(nullptr));
        metadataStore->save(fileName, metadata);
    }
    return content;
}

// Remove a file
void LocalFileManagement::remove(const std::string& userID, const std::string& fileName) {
    if (!exists(userID, fileName)) {
        throw std::runtime_error("File does not exist: " + fileName);
    }
    // Delete file
    auto physicalPath = pathMapper->resolve(fileName);
    storage->deleteFile(physicalPath);
    // Remove metadata
    metadataStore->remove(fileName);
}

// Check if file exists
bool LocalFileManagement::exists(const std::string& userID, const std::string& fileName) {
    return metadataStore->exists(fileName);
}

// List all files for a user (even not of the current user)
std::vector<std::string> LocalFileManagement::list(const std::string& userID) {
    std::vector<std::string> fileList;
    auto allMetadata = metadataStore->list();
    for (const auto& [key, metadata] : allMetadata) {
        fileList.push_back(metadata.logicalName);
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

