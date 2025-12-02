#include "JsonMetadataStore.h"
#include <fstream>
#include <iostream>

// Constructor
JsonMetadataStore::JsonMetadataStore(const std::filesystem::path& storageFile)
    : storageFile(storageFile)
{
    std::lock_guard<std::mutex> lock(mtx);
    loadFromDiskUnsafe(); // load existing metadata if file exists
}

// Load the JSON from disk into cache (caller must hold lock)
void JsonMetadataStore::loadFromDiskUnsafe() const {
    // No lock here - caller must hold the lock
    if (!std::filesystem::exists(storageFile)) {
        return; // No existing file, nothing to load
    }

    // Open the file for reading
    std::ifstream inFile(storageFile);
    if (!inFile.is_open()) {
        throw std::runtime_error("Failed to open metadata file for reading: " + storageFile.string());
    }
    // Parse JSON
    nlohmann::json j;
    inFile >> j;
    // Populate cache
    for (auto& [key, value] : j.items()) {
        cache[key] = fromJson(value);
    }
}

// Write the cache to disk as JSON (caller must hold lock)
void JsonMetadataStore::saveToDiskUnsafe() const {
    // No lock here - caller must hold the lock
    nlohmann::json j;
    for (const auto& [key, metadata] : cache) {
        j[key] = toJson(metadata);
    }

    // Open the file for writing
    std::ofstream outFile(storageFile);
    if (!outFile.is_open()) {
        throw std::runtime_error("Failed to open metadata file for writing: " + storageFile.string());
    }
    outFile << j.dump(4); // pretty print with 4 spaces
}

// Convert FileMetaData to JSON
nlohmann::json JsonMetadataStore::toJson(const FileMetaData& metadata) const {
    nlohmann::json j;
    j["ownerId"] = metadata.ownerId;
    j["logicalName"] = metadata.logicalName;
    j["physicalPath"] = metadata.physicalPath.string();
    j["fileSize"] = metadata.fileSize;
    j["createdAt"] = metadata.createdAt;
    j["modifiedAt"] = metadata.modifiedAt;
    return j;
}

// Convert JSON to FileMetaData
FileMetaData JsonMetadataStore::fromJson(const nlohmann::json& j) const {
    FileMetaData metadata;
    metadata.ownerId = j.at("ownerId").get<std::string>();
    metadata.logicalName = j.at("logicalName").get<std::string>();
    metadata.physicalPath = j.at("physicalPath").get<std::string>();
    metadata.fileSize = j.at("fileSize").get<size_t>();         
    metadata.createdAt = j.at("createdAt").get<std::string>();
    metadata.modifiedAt = j.at("modifiedAt").get<std::string>();
    return metadata;
}

// Save or overwrite metadata for a given key
void JsonMetadataStore::save(const std::string& key, const FileMetaData& metadata) {
    std::lock_guard<std::mutex> lock(mtx);
    cache[key] = metadata;
    saveToDiskUnsafe();
}

// Load metadata for a given key
std::optional<FileMetaData> JsonMetadataStore::load(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mtx);
    auto it = cache.find(key);
    if (it != cache.end()) {
        return it->second;
    }
    return std::nullopt;
}

// Remove metadata entry
void JsonMetadataStore::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(mtx);
    cache.erase(key);
    saveToDiskUnsafe(); // Save changes to disk
}

// Check if metadata exists for this key
bool JsonMetadataStore::exists(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mtx);
    return cache.find(key) != cache.end();
}   

// List all metadata entries
std::vector<std::pair<std::string, FileMetaData>> JsonMetadataStore::list() const {
    std::lock_guard<std::mutex> lock(mtx);
    std::vector<std::pair<std::string, FileMetaData>> entries;
    for (const auto& [key, metadata] : cache) {
        entries.emplace_back(key, metadata);
    }
    return entries;
}   

