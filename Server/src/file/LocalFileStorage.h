#ifndef LOCALFILESTORAGE_H
#define LOCALFILESTORAGE_H

#include "IFileStorage.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Local file system - handle disk storage operations
// Base path configured via OVERDRIVE_PATH environment variable
class LocalFileStorage  : public IFileStorage {
    private:
        std::filesystem::path basePath; 
        
    public:
        LocalFileStorage();

         // Basic file operations
        virtual void writeFile(const std::filesystem::path& physicalPath, const std::string &content = "") override;
        virtual std::string readFile(const std::filesystem::path& physicalPath) override;
        virtual void deleteFile(const std::filesystem::path& physicalPath) override;
    
};

#endif // LOCALFILESTORAGE_H