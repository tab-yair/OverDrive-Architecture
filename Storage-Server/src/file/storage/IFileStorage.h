#ifndef FILESTORAGE_H
#define FILESTORAGE_H

#include <string>
#include <vector>
#include <filesystem>

// Interface for file management operations with compression support
class IFileStorage {
    
    public:
        virtual ~IFileStorage() = default;
        
        // Update existing file content. Fails if file doesn't exist.
        virtual void writeFile(const std::filesystem::path& physicalPath, const std::string &content = "") = 0;
        
        // Read and return file content. Throws if file doesn't exist.
        virtual std::string readFile(const std::filesystem::path& physicalPath) = 0;
        
        // Delete file. Idempotent - doesn't throw if file doesn't exist.
        virtual void deleteFile(const std::filesystem::path& physicalPath) = 0;
        

    };

#endif // IFILESTORAGE_H