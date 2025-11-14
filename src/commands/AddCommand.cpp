#include "AddCommand.h"
#include <cstdlib>      // std::getenv
#include <sstream>      // std::stringstream
#include <utility>      // std::move

// Define the fixed subdirectory name for storing files.
const std::string OVERDRIVE_SUBDIR = "overdrive_files/"; 

AddCommand::AddCommand(std::shared_ptr<FileManager> fileManager,
                       std::shared_ptr<ICompressor> compressor)
    : fileManager(std::move(fileManager)),
      compressor(std::move(compressor)) {}


void AddCommand::execute(const std::vector<std::string>& args) {

    // if missing dependencies, return without doing anything
    if (!fileManager || !compressor) {
        return;
    }

    // If no filename provided, there is nothing to do.
    if (args.empty()) {
        return;
    }

    // --- Resolve Base Path ---

    // Get the base directory from the environment variable.
    const char* envPath = std::getenv("OVERDRIVE_PATH");
    if (!envPath) {
        return;
    }

    std::string basePath = envPath;

    // Append a trailing slash if necessary.
    if (!basePath.empty() && basePath.back() != '/' && basePath.back() != '\\') {
        basePath += '/';
    }

    // --- Ensure Subdirectory Exists ---
    
    // Construct the path to the dedicated data subdirectory.
    const std::string subDirPath = basePath + OVERDRIVE_SUBDIR;

    // Check if the subdirectory exists. If not, try to create it.
    try {
        if (!fileManager->exists(subDirPath)) {
            // If creation fails, stop execution.
            if (!fileManager->createDirectory(subDirPath)) {
                return; 
            }
        }
    } catch (...) {
        return; // Exception during directory check/creation.
    }

    // --- Existence Check ---

    // Full path includes the subdirectory.
    const std::string& fileName = args[0];
    const std::string fullPath = subDirPath + fileName;
    
    // Do not overwrite an existing file.
    if (fileManager->exists(fullPath)) {
        return;
    }

    // --- Prepare Content ---
    
    // Combine all arguments after the filename into a single text string.
    std::string inputText;
    if (args.size() > 1) {
        inputText = args[1];
    } else {
        inputText = ""; // No text provided results in empty content.
    }

    // --- Compress and Write ---

    std::string compressed;
    
    // Attempt compression, handle exceptions silently.
    try {
        compressed = compressor->compress(inputText);
    } catch (...) {
        return;
    }

    // Attempt to write the compressed data, handle exceptions silently.
    try {
        fileManager->writeFile(fullPath, compressed);
    } catch (...) {
        return;
    }
}