#ifndef RLE_COMPRESSOR_H
#define RLE_COMPRESSOR_H

#include "ICompressor.h"

// Run-Length Encoding (RLE) compression algorithm
class RLECompressor : public ICompressor {
    public:
        // Compress input data using RLE algorithm
        std::string compress(const std::string& data) override;
        
        // Decompress input data using RLE algorithm
        std::string decompress(const std::string& data) override;

};

#endif // RLE_COMPRESSOR_H