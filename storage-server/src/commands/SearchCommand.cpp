#include "commands/SearchCommand.h"
#include <sstream>
#include <stdexcept>

SearchCommand::SearchCommand(std::shared_ptr<IFileManagement> fileManager)
    : fileManager(std::move(fileManager)) {}

CommandResult SearchCommand::execute(const std::vector<std::string>& args) {
    // Validate dependencies
    if (!fileManager) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // Check if arguments exist
    if (args.empty()) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // Build the search term from args
    std::stringstream ss;
    for (size_t i = 0; i < args.size(); ++i) {
        ss << args[i];
        if (i < args.size() - 1) {
            ss << " ";
        }
    }
    std::string searchTerm = ss.str();

    if (searchTerm.empty()) {  // if no search term provided
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    std::vector<std::string> matchedFiles;
    try {
        // Perform the search
        matchedFiles = fileManager->search(searchTerm);
    }
    catch (const std::exception&) {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    // If no files matched, OK with empty content
    if (matchedFiles.empty()) {
        return CommandResult(CommandResult::Status::OK);
    }

    // Build output string
    std::stringstream resultStream;
    for (size_t i = 0; i < matchedFiles.size(); ++i) {
        resultStream << matchedFiles[i];
        if (i != matchedFiles.size() - 1) {
            resultStream << " ";
        }
    }

    return CommandResult(CommandResult::Status::OK, resultStream.str());
}
