#ifndef LOCALFILEMANAGEMENT_H
#define LOCALFILEMANAGEMENT_H

#include "file/management/IFileManagement.h"
#include "file/path/IPathMapper.h"
#include "file/storage/IFileStorage.h"
#include "file/metadata/IMetadataStore.h"
#include "file/metadata/FileMetadata.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Local file system implementation with compression support
// Base path configured via OVERDRIVE_PATH environment variable
class LocalFileManagement : public IFileManagement {
    private:
        std::unique_ptr<IPathMapper> pathMapper; // Logical to physical path resolver
        std::unique_ptr<IFileStorage> storage; // Underlying file storage
        std::unique_ptr<IMetadataStore> metadataStore; // Metadata storage
        
    public:
        LocalFileManagement(std::unique_ptr<IPathMapper> pathMapper,
                            std::unique_ptr<IFileStorage> storage,
                            std::unique_ptr<IMetadataStore> metadataStore);

         // Basic file operations
        virtual void create(const std::string& userID, const std::string& fileName, const std::string &content = "") override;
        virtual void write(const std::string& userID, const std::string& fileName, const std::string &content) override;
        virtual std::string read(const std::string& userID, const std::string& fileName) override;
        virtual void remove(const std::string& userID, const std::string& fileName) override;
        virtual bool exists(const std::string& userID, const std::string& fileName) override;
        virtual std::vector<std::string> list(const std::string& userID) override;
        virtual std::vector<std::string> search(const std::string& userID, const std::string& content) override;
               
};

#endif // LOCALFILEMANAGEMENT_H