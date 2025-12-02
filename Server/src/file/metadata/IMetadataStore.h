#ifndef IMETADATASTORE_H
#define IMETADATASTORE_H

#include <string>
#include <vector>
#include <optional>
#include "file/metadata/FileMetadata.h"

class IMetadataStore {
public:
    virtual ~IMetadataStore() = default;

    // Save or overwrite metadata for a given key
    virtual void save(const std::string& key, const FileMetaData& metadata) = 0;

    // Load metadata for a given key (std::optional if missing)
    virtual std::optional<FileMetaData> load(const std::string& key) const = 0;

    // Remove metadata entry
    virtual void remove(const std::string& key) = 0;

    // Check if metadata exists for this key
    virtual bool exists(const std::string& key) const = 0;

    // List all metadata entries as (key, metadata)
    virtual std::vector<std::pair<std::string, FileMetaData>> list() const = 0;
};

#endif // IMETADATASTORE_H