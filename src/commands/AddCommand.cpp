#include "AddCommand.h"
#include <cstdlib>
#include <sstream>
#include <utility>
#include <stdexcept>

AddCommand::AddCommand(std::shared_ptr<FileManager> fileManager)
    : fileManager(std::move(fileManager)) {}


std::optional<std::string> AddCommand::execute(const std::vector<std::string>& args) {

    // if missing dependencies, stop immediately
    if (!fileManager) {
        return std::nullopt;
    }

    // If no filename provided, there is nothing to do.
    if (args.empty()) {
        return std::nullopt;
    }

    // args[0] is the filename
    const std::string& fileName = args[0];
    
    // Combine all arguments after the filename into a single text string.
    std::string inputText;
    
    if (args.size() > 1) {
        std::stringstream currStr;
        for (size_t i = 1; i < args.size(); ++i) {
            currStr << args[i];
            // Add space between words, but not after the last word.
            if (i < args.size() - 1) {
                currStr << " ";
            }
        }
        inputText = currStr.str(); 
    } else {
        inputText = ""; // Handle empty content case
    }
    
    // Attempt to write the compressed data
    fileManager->create(fileName, inputText);

    return std::nullopt;
}