#include "RLECompressor.h"
#include <sstream>
#include <stdexcept>

std::string RLECompressor::compress(const std::string& data) {
    if (data.empty()) return "";

    std::ostringstream compressed;
    char currentChar = data[0];
    int count = 1;
    for(size_t i = 1; i < data.size(); i++){
        if(data[i] == currentChar){
            count++;
        } else {
            compressed << currentChar << count;
            currentChar = data[i];
            count = 1;
        }
    }
    compressed << currentChar << count; // last run
    return compressed.str();
}

std::string RLECompressor::decompress(const std::string& data) {
    if(data.empty()) return "";

    std::ostringstream decompressed;
    
    for(size_t i = 0; i < data.size(); ) {
        char currentChar = data[i++];
        if (i >= data.size()) {
            return ""; // malformed input - no count after character
        }

        int count = 0;
        bool foundDigit = false;
        while (i < data.size() && isdigit(data[i])) {
            count = count * 10 + (data[i++] - '0'); 
            foundDigit = true; //     
        }

        if (!foundDigit) {
            return ""; // malformed input: character without a count
        }

        if (count <= 0) {
            return ""; // malformed input: count must be positive
        }

        decompressed << std::string(count, currentChar);
    }
    return decompressed.str();
}

        