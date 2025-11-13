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
    if (data.empty()) return "";

    std::ostringstream decompressed;
    size_t i = 0;

    while (i < data.size()) {
        char ch = data[i++];
        if (i >= data.size() || !isdigit(data[i])) return "";

        std::string countStr;
        while (i < data.size() && isdigit(data[i])) countStr += data[i++];

        if (countStr.size() > 1 && countStr[0] == '0') return "";

        int count = std::stoi(countStr);
        if (count <= 0) return "";

        decompressed << std::string(count, ch);
    }

    return decompressed.str();
}
        