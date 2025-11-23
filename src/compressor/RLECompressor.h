#ifndef RLE_COMPRESSOR_H
#define RLECOMPRESSOR_H

#include "compressor/ICompressor.h"

// Run-Length Encoding (RLE) compression algorithm
class RLECompressor : public ICompressor {
    private:
        static constexpr unsigned char DELIMITER = 0xFF;  // Delimiter byte (0xFF) separating character from count in compressed format
        static constexpr int MAX_RUN_LENGTH = 255; // Maximum run length for RLE compression

    public:
        // Compress input data using RLE algorithm
        std::string compress(const std::string& data) override;
        
        // Decompress input data using RLE algorithm
        std::string decompress(const std::string& data) override;

};

#endif // RLE_COMPRESSOR_H