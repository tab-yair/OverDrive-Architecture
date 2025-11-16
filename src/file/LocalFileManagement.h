#ifndef LOCALFILEMANAGEMENT_H
#define LOCALFILEMANAGEMENT_H

#include "IFileManagement.h"
#include "ICompressor.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>


class LocalFileManagement : public IFileManagement {
    private:
        std::unique_ptr<ICompressor> compressor; 
        std::filesystem::path basePath; 
        std::filesystem::path fullPath(const std::string& fileName) const;
        
    public:
        LocalFileManagement(std::unique_ptr<ICompressor> compressor);

         // Basic file operations
        virtual bool write(const std::string& fileName, const std::string &content) override;
        virtual std::string read(const std::string& fileName) override;
        virtual bool remove(const std::string& fileName) override;
        virtual bool exists(const std::string& fileName) override;
        virtual std::vector<std::string> fileList() override;
        // Compression helpers
        bool writeCompressed(const std::string& fileName, const std::string& content) override;
        std::string readDecompressed(const std::string& fileName) override;
        std::vector<std::string> searchContent(const std::string& content) override;
};

#endif // LOCALFILEMANAGEMENT_H