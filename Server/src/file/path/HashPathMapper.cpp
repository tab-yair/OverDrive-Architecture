#include "HashPathMapper.h"
#include <sstream>
#include <iomanip>
#include <stdexcept>
#include <openssl/sha.h>

// Constructor
HashPathMapper::HashPathMapper(const std::filesystem::path& base)
    : basePath(base) {
    // Validate base path
    if (basePath.empty()) {
        throw std::invalid_argument("Base path cannot be empty");
    }
    // Ensure base path exists
    if (!std::filesystem::exists(basePath)) {
        std::filesystem::create_directories(basePath);
    }
    // Ensure base path is a directory
    if (!std::filesystem::is_directory(basePath)) {
        throw std::invalid_argument("Base path must be a directory: " + basePath.string());
    }
}

// Resolves logical file name to a physical file system path
std::filesystem::path HashPathMapper::resolve(const std::string& logicalFileName) const {
    // Validate logical file name
    if (logicalFileName.empty()) {
        throw std::invalid_argument("Logical file name cannot be empty");
    }
    // Compute the hash and append to base path
    return basePath / computeHash(logicalFileName);
}

// Computes SHA256 hash of the logical file name
std::string HashPathMapper::computeHash(const std::string& logicalName) const {
    // Compute SHA256 hash
    unsigned char hash[SHA256_DIGEST_LENGTH];

    // Use OpenSSL to compute the hash
    SHA256(reinterpret_cast<const unsigned char*>(logicalName.c_str()), 
           logicalName.size(), hash);
    // Convert hash bytes to hexadecimal string
    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}