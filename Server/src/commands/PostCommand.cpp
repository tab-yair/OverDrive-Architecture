#include "commands/PostCommand.h"
#include <cstdlib>
#include <sstream>
#include <utility>
#include <stdexcept>

PostCommand::PostCommand(std::shared_ptr<IFileManagement> fileManager, std::shared_ptr<ClientContext> context)
    : fileManager(std::move(fileManager)), clientContext(std::move(context)) {}


CommandResult PostCommand::execute(const std::vector<std::string>& args) {
    // if missing dependencies, stop immediately
    if (!fileManager || !clientContext) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // If no filename provided, there is nothing to do.
    if (args.empty()) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // args[0] is the filename
    const std::string& fileName = args[0];

    // if file exists, return BAD_REQUEST
    if (fileManager->exists(clientContext->clientId, fileName)) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }
    
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
    try
    {
        fileManager->create(clientContext->clientId, fileName, inputText);
    }
    catch(const std::exception& e)
    {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    return CommandResult(CommandResult::Status::CREATED);
}