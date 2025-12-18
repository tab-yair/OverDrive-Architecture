#ifndef LOCALFILESTORAGE_H
#define LOCALFILESTORAGE_H

#include "file/storage/IFileStorage.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Local file system - handle disk storage operations
class LocalFileStorage  : public IFileStorage {        
public:
    LocalFileStorage();

    // Basic file operations
    virtual void writeFile(const std::filesystem::path& physicalPath, const std::string &content = "") override;
    virtual std::string readFile(const std::filesystem::path& physicalPath) override;
    virtual void deleteFile(const std::filesystem::path& physicalPath) override;
    
};

#endif // LOCALFILESTORAGE_H