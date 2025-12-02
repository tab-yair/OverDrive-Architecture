#ifndef IFILEMANAGEMENT_H
#define IFILEMANAGEMENT_H

#include <string>
#include <vector>
#include <filesystem>

// Interface for file management operations with compression support
class IFileManagement {
    
    public:
        virtual ~IFileManagement() = default;

        // Create a new file with optional content. Fails if file already exists.
        virtual void create(const std::string& userID, const std::string& fileName, const std::string &content = "") = 0;
        
        // Update existing file content. Fails if file doesn't exist.
        virtual void write(const std::string& userID, const std::string& fileName, const std::string &content) = 0;
        
        // Read and return file content. Throws if file doesn't exist.
        virtual std::string read(const std::string& userID, const std::string& fileName) = 0;
        
        // Delete file. Idempotent - doesn't throw if file doesn't exist.
        virtual void remove(const std::string& userID, const std::string& fileName) = 0;
        
        // Check if file exists.
        virtual bool exists(const std::string& userID, const std::string& fileName) = 0;
        

        //list all files containing the specified content substring.
        virtual std::vector<std::string> list(const std::string& userID) = 0;

        // Search for files containing the specified content substring.
        virtual std::vector<std::string> search(const std::string& userID, const std::string& content) = 0;
    };



#endif // IFILEMANAGEMENT_H