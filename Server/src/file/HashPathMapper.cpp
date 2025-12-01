#include "HashPathMapper.h"
#include <sstream>
#include <iomanip>
#include <stdexcept>
#include <openssl/sha.h>

// Constructor
HashPathMapper::HashPathMapper(const std::filesystem::path& base)
    : basePath(base) {
    if (basePath.empty()) {
        throw std::invalid_argument("Base path cannot be empty");
    }
    
    if (!std::filesystem::exists(basePath)) {
        std::filesystem::create_directories(basePath);
    }
    
    if (!std::filesystem::is_directory(basePath)) {
        throw std::invalid_argument("Base path must be a directory: " + basePath.string());
    }
}

// Resolves logical file name to a physical file system path
std::filesystem::path HashPathMapper::resolve(const std::string& logicalFileName) const {
    if (logicalFileName.empty()) {
        throw std::invalid_argument("Logical file name cannot be empty");
    }
    
    return basePath / computeHash(logicalFileName);
}

// Computes SHA256 hash of the logical file name
std::string HashPathMapper::computeHash(const std::string& logicalName) const {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    
    SHA256(reinterpret_cast<const unsigned char*>(logicalName.c_str()), 
           logicalName.size(), hash);

    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}