#ifndef ICOMPRESSOR_H
#define ICOMPRESSOR_H

#include <string>

// Abstract class defining the interface for all compression algorithms
class ICompressor {
    public:
        // Virtual destructor to ensure proper cleanup of derived classes
        virtual ~ICompressor() = default;

        // Pure virtual method to compress input data
        virtual std::string compress(const std::string& data) = 0;

        // Pure virtual method to decompress input data
        virtual std::string decompress(const std::string& data) = 0;
};

#endif // ICOMPRESSOR_H