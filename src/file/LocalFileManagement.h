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
        
        // Internal helper - performs actual file writing to physical path
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