#ifndef FILEMANAGEMENT_H
#define FILEMANAGEMENT_H

#include <string>
#include <vector>
#include <filesystem>

class IFileManagement {
    
    public:
        virtual ~IFileManagement() = default;

        // Basic file operations
        virtual void create(const std::string& fileName, const std::string &content = "") = 0;
        virtual void write(const std::string& fileName, const std::string &content) = 0;
        virtual std::string read(const std::string& fileName) = 0;
        virtual void remove(const std::string& fileName) = 0;
        virtual bool exists(const std::string& fileName) = 0;
        virtual std::vector<std::string> fileList() = 0;
        virtual std::vector<std::string> searchContent(const std::string& content) = 0;
    };



#endif // IFILEMANAGEMENT_H