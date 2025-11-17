#include "RLECompressor.h"
#include <sstream>
#include <stdexcept>

std::string RLECompressor::compress(const std::string& data) {
    if (data.empty()) return ""; // Return empty string if input is empty

    std::ostringstream compressed;
    char currentChar = data[0];
    int count = 1;

    for(size_t i = 1; i < data.size(); i++){
        if(data[i] == currentChar && count < MAX_RUN_LENGTH){
            count++;
        } else {
            // Format: [char][DELIMITER][count as byte]
            compressed << currentChar 
                      << static_cast<char>(DELIMITER) 
                      << static_cast<char>(count);
            currentChar = data[i];
            count = 1;
        }
    }

    // Write last run
    compressed << currentChar 
              << static_cast<char>(DELIMITER) 
              << static_cast<char>(count);
              
    return compressed.str();
}

std::string RLECompressor::decompress(const std::string& data) {
    if (data.empty()) {
        return ""; // Return empty string if input is empty
    }

    std::ostringstream decompressed;
    size_t i = 0;

    while (i < data.size()) {
        // Need at least 3 bytes: [char][delimiter][count]
        if (i + 2 >= data.size()) {
            throw std::invalid_argument("Invalid compressed format: incomplete data");
        }
        
        char ch = data[i++];
        
        // Check for delimiter
        if (static_cast<unsigned char>(data[i]) != DELIMITER) {
            throw std::invalid_argument("Invalid compressed format: missing delimiter");
        }
        i++;
        
        // Get count (as unsigned byte)
        unsigned char count = static_cast<unsigned char>(data[i++]);
        
        if (count == 0) {
            throw std::invalid_argument("Invalid compressed format: count cannot be zero");
        }
        
        // Append 'count' copies of 'ch'
        decompressed << std::string(count, ch);
    }

    return decompressed.str();
}
