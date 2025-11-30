#include "commands/SearchCommand.h"
#include <sstream>
#include <stdexcept>

SearchCommand::SearchCommand(std::shared_ptr<IFileManagement> fileManager, const ClientContext& context)
    : fileManager(std::move(fileManager)), clientContext(context) {}

CommandResult SearchCommand::execute(const std::vector<std::string>& args) {
    // Check if the fileManager dependency is valid
    if (!fileManager) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // Check if there are any arguments
    if (args.empty()) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
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
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    std::vector<std::string> matchedFiles;
    try
    {
        // Search for files containing the given content
        matchedFiles = fileManager->searchContent(clientContext.clientId, searchTerm);
    }
    catch(const std::exception& e)
    {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    // If no files matched, return no content
    if (matchedFiles.empty()) {
        return CommandResult(CommandResult::Status::OK);
    }

    // Join the matched filenames separated by spaces
    std::stringstream resultStream;
    for (size_t i = 0; i < matchedFiles.size(); ++i) {
        resultStream << matchedFiles[i];
        if (i != matchedFiles.size() - 1) {
            resultStream << " ";
        }
    }

    return CommandResult(CommandResult::Status::OK, resultStream.str());
}
