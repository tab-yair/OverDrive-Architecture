#include "RLECompressor.h"
#include <sstream>
#include <stdexcept>

std::string RLECompressor::compress(const std::string& data) {
    if (data.empty()) return ""; // Return empty string if input is empty

    std::ostringstream compressed;
    char currentChar = data[0];
    int count = 1;

    for(size_t i = 1; i < data.size(); i++){
        if(data[i] == currentChar){
            count++; // Same character, increase count
        } else {
            compressed << currentChar << count; // Write character and its count
            currentChar = data[i];              // Move to next character
            count = 1;                          // Reset count
        }
    }

    compressed << currentChar << count; // Write last character and count
    return compressed.str();
}

std::string RLECompressor::decompress(const std::string& data) {
    if (data.empty()) {
        return ""; // Return empty string if input is empty
    }

    std::ostringstream decompressed;
    size_t i = 0;

    while (i < data.size()) {
        char ch = data[i++]; // Read character

        // Next characters must be digits representing count
        if (i >= data.size() || !isdigit(data[i])) {
            return "";
        }

        std::string countStr;
        while (i < data.size() && isdigit(data[i])) {
            countStr += data[i++]; // Read full count
        }

        if (countStr.size() > 1 && countStr[0] == '0') {
            return ""; // Leading zeros not allowed
        }

        int count = std::stoi(countStr);
        if (count <= 0) {
            return ""; // Count must be positive
        }

        decompressed << std::string(count, ch); 
    }

    return decompressed.str();
}
