#ifndef LOCALFILEMANAGEMENT_H
#define LOCALFILEMANAGEMENT_H

#include "file/IFileManagement.h"
#include "compressor/ICompressor.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Local file system implementation with compression support
// Base path configured via OVERDRIVE_PATH environment variable
class LocalFileManagement : public IFileManagement {
    private:
        std::unique_ptr<ICompressor> compressor; 
        std::filesystem::path basePath; 
        
        // Validates fileName for security (path traversal prevention)
        void validateFileName(const std::string& fileName) const;
        
        // Constructs full filesystem path from basePath and fileName
        std::filesystem::path buildFullPath(const std::string& fileName) const;
        
        // Internal helper - compresses and writes content to disk
        void writeInternal(const std::filesystem::path& filePath, const std::string &content);
        
    public:
        LocalFileManagement(std::unique_ptr<ICompressor> compressor);

         // Basic file operations
        virtual void create(const std::string& fileName, const std::string &content = "") override;
        virtual void write(const std::string& fileName, const std::string &content) override;
        virtual std::string read(const std::string& fileName) override;
        virtual void remove(const std::string& fileName) override;
        virtual bool exists(const std::string& fileName) override;
        virtual std::vector<std::string> fileList() override;
        std::vector<std::string> searchContent(const std::string& content) override;
               
};

#endif // LOCALFILEMANAGEMENT_H