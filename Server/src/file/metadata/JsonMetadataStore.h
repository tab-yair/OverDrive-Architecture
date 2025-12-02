#ifndef JSONMETADATASTORE_H
#define JSONMETADATASTORE_H

#include "file/metadata/IMetadataStore.h"
#include "file/metadata/FileMetadata.h"
#include <string>
#include <unordered_map>
#include <optional>
#include <nlohmann/json.hpp>  
#include <filesystem>
#include <mutex>

class JsonMetadataStore : public IMetadataStore {
private:
    std::filesystem::path storageFile;  // Path to JSON file
    mutable std::unordered_map<std::string, FileMetaData> cache; // In-memory cache for fast access
    mutable std::mutex mtx;   // Thread safety

    // Load the JSON from disk into cache (caller must hold lock)
    void loadFromDiskUnsafe() const;

    // Write the cache to disk as JSON (caller must hold lock)
    void saveToDiskUnsafe() const;

    // Convert FileMetaData to/from JSON
    nlohmann::json toJson(const FileMetaData& metadata) const;
    FileMetaData fromJson(const nlohmann::json& j) const;

public:
    explicit JsonMetadataStore(const std::filesystem::path& storageFile);

    // Save or overwrite metadata for a given key
    void save(const std::string& key, const FileMetaData& metadata) override;

    // Load metadata for a given key
    std::optional<FileMetaData> load(const std::string& key) const override;

    // Remove metadata entry
    void remove(const std::string& key) override;

    // Check if metadata exists for this key
    bool exists(const std::string& key) const override;

    // List all metadata entries
    std::vector<std::pair<std::string, FileMetaData>> list() const override;


};

#endif // JSONMETADATASTORE_H
