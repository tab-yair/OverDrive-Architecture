#ifndef HASHPATHMAPPER_H
#define HASHPATHMAPPER_H

#include "IPathMapper.h"
#include <string>
#include <filesystem>


class HashPathMapper : public IPathMapper {
private:
    // Base directory for all files
    std::filesystem::path basePath;  
    // Compute hash using FNV-1a algorithm
    std::string computeHash(const std::string& input) const;
    
public:
    // Constructor
    explicit HashPathMapper(const std::filesystem::path& base);
    // Resolve logical file name to physical path
    std::filesystem::path resolve(const std::string& logicalFileName) const override;

};

#endif // HASHPATHMAPPER_H
