#ifndef FILEMETADATA_H
#define FILEMETADATA_H

#include <string>
#include <filesystem>


// Structure to hold file metadata information
struct FileMetaData {
    std::string ownerId;                      // ID of the owner client
    std::string logicalName;                  // Name of the logical name (e.g., "document.txt")
    std::filesystem::path physicalPath;       // Physical path on disk
    size_t fileSize;                          // Size of the file in bytes
    std::string createdAt;                   // Creation timestamp (ISO 8601 format) 
    std::string modifiedAt;                  // Last modified timestamp (ISO 8601 format)
};

#endif // FILEMETADATA_H