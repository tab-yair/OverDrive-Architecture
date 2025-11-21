#include "SearchCommand.h"
#include <sstream>
#include <optional>
#include <stdexcept>

SearchCommand::SearchCommand(std::shared_ptr<IFileManagement> fileManager)
    : fileManager(std::move(fileManager)) {}

std::optional<std::string> SearchCommand::execute(const std::vector<std::string>& args) {
    // Check if the fileManager dependency is valid
    if (!fileManager) {
        return std::nullopt;
    }

    // Check if there are any arguments
    if (args.empty()) {
        return std::nullopt;
    }

    // Join all args into a single search string separated by spaces
    std::stringstream ss;
    for (size_t i = 0; i < args.size(); ++i) {
        ss << args[i];
        if (i < args.size() - 1) {
            ss << " ";
        }
    }
    std::string searchTerm = ss.str();

    // If the resulting search term is empty, treat as invalid
    if (searchTerm.empty()) {
        return std::nullopt;
    }

    // Search for files containing the given content
    std::vector<std::string> matchedFiles = fileManager->searchContent(searchTerm);

    // If no files matched, return nullopt
    if (matchedFiles.empty()) {
        return std::nullopt;
    }

    // Join the matched filenames separated by spaces
    std::stringstream resultStream;
    for (size_t i = 0; i < matchedFiles.size(); ++i) {
        resultStream << matchedFiles[i];
        if (i != matchedFiles.size() - 1) {
            resultStream << " ";
        }
    }

    return resultStream.str();
}
