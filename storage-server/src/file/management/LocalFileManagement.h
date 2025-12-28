#ifndef LOCALFILEMANAGEMENT_H
#define LOCALFILEMANAGEMENT_H

#include "file/management/IFileManagement.h"
#include "file/storage/IFileStorage.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Local file system implementation with compression support
// Base path configured via OVERDRIVE_PATH environment variable or constructor parameter
class LocalFileManagement : public IFileManagement {
    private:
        std::unique_ptr<IFileStorage> storage; // Underlying file storage with compression
        std::filesystem::path basePath; // Base directory for file storage
        
        // Validates fileName is not empty
        void validateFileName(const std::string& fileName) const;
        
        // Constructs full filesystem path from basePath and fileName
        std::filesystem::path buildFullPath(const std::string& fileName) const;
        
    public:
        // Constructor with explicit basePath
        LocalFileManagement(std::unique_ptr<IFileStorage> storage, 
                          const std::filesystem::path& basePath);
        
        // Constructor using OVERDRIVE_PATH environment variable
        explicit LocalFileManagement(std::unique_ptr<IFileStorage> storage);

        // Basic file operations
        virtual void create(const std::string& fileName, const std::string &content = "") override;
        virtual void write(const std::string& fileName, const std::string &content) override;
        virtual std::string read(const std::string& fileName) override;
        virtual void remove(const std::string& fileName) override;
        virtual bool exists(const std::string& fileName) override;
        virtual std::vector<std::string> list() override;
        virtual std::vector<std::string> search(const std::string& query) override;
};

#endif // LOCALFILEMANAGEMENT_H