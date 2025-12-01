#ifndef HASHPATHMAPPER_H
#define HASHPATHMAPPER_H

#include "IPathMapper.h"
#include <string>
#include <filesystem>


class HashPathMapper : public IPathMapper {
private:
    std::filesystem::path basePath;  // Base directory for all files 
    // Compute hash using FNV-1a algorithm
    std::string computeHash(const std::string& input) const;
    
public:
    
    explicit HashPathMapper(const std::filesystem::path& base);
    
    std::filesystem::path resolve(const std::string& logicalFileName) const override;

};

#endif // HASHPATHMAPPER_H
