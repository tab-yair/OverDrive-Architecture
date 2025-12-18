#ifndef COMPRESSEDFILESTORAGE_H
#define COMPRESSEDFILESTORAGE_H

#include "file/storage/IFileStorage.h"
#include "file/compressor/ICompressor.h"
#include <string>
#include <memory>
#include <vector>
#include <filesystem>

// Compressed file system - handle disk storage operations with compression
class CompressedFileStorage  : public IFileStorage {
    private:
        std::unique_ptr<ICompressor> compressor; 
        std::unique_ptr<IFileStorage> basicStorage;
        
    public:
        CompressedFileStorage(std::unique_ptr<ICompressor> compressor, std::unique_ptr<IFileStorage> basicStorage);

         // Basic file operations
        virtual void writeFile(const std::filesystem::path& physicalPath, const std::string &content = "") override;
        virtual std::string readFile(const std::filesystem::path& physicalPath) override;
        virtual void deleteFile(const std::filesystem::path& physicalPath) override;
    
};

#endif // COMPRESSEDFILESTORAGE_H