#include "LocalFileStorage.h"
#include <fstream>
#include <stdexcept>

using namespace std;
namespace fs = std::filesystem;

LocalFileStorage::LocalFileStorage() {}

void LocalFileStorage::writeFile(const std::filesystem::path& physicalPath, const std::string &content) {
     // Open the file in binary mode
    ofstream file(physicalPath, ios::binary);

    // Check if the file was successfully opened
    if (!file.is_open()) {
        throw runtime_error("Failed to open file for writing: " + physicalPath.string());
    }

    // Write the content in binary mode
    file.write(content.data(), content.size());

    // Check if writing succeeded
    if (!file) {
        throw runtime_error("Failed to write content to file: " + physicalPath.string());
    }

    // Explicitly close the file and check for flush errors
    file.close();
    if (!file) {
        throw runtime_error("Failed to close file (flush error): " + physicalPath.string());
    }
}

string LocalFileStorage::readFile(const std::filesystem::path& physicalPath) {
    ifstream in(physicalPath, ios::binary | ios::ate); // open at end to get size immediately
    if (!in) {
        throw runtime_error("Failed to open file for reading: " + physicalPath.string());
    }

    auto fileSize = in.tellg(); // get size
    if (fileSize == 0) return {}; // empty file

    string content(static_cast<size_t>(fileSize), '\0'); // allocate string

    in.seekg(0); // go back to beginning
    in.read(content.data(), fileSize); // read all bytes
    if (!in) {
        throw runtime_error("Failed to read file: " + physicalPath.string());
    }

    return content;
}

void LocalFileStorage::deleteFile(const std::filesystem::path& physicalPath) {
    if (!fs::exists(physicalPath)) {
        throw runtime_error("File not found for deletion: " + physicalPath.string());
    }
    
    std::error_code ec;
    bool success = fs::remove(physicalPath, ec);
    
    if (!success || ec) {
        throw runtime_error("Failed to delete file: " + physicalPath.string() + " (" + ec.message() + ")");
    }
}



