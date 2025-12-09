#include "commands/DeleteCommand.h"
#include <stdexcept>

DeleteCommand::DeleteCommand(std::shared_ptr<IFileManagement> fileManager, std::shared_ptr<ClientContext> context)
    : fileManager(std::move(fileManager)), clientContext(std::move(context)) {}

CommandResult DeleteCommand::execute(const std::vector<std::string>& args) {
    // Check if the fileManager dependency is valid
    if (!fileManager || !clientContext) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // validate there are arguments
    if (args.empty()) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    const std::string& fileName = args[0];

    // Check if file exists first
    if (!fileManager->exists(clientContext->clientId, fileName)) {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    // try deleting the file
    try {
        fileManager->remove(clientContext->clientId, fileName);
    } catch (const std::exception& e) {
        // if removing the file has failed
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    // if deletion succeeded - return OK
    return CommandResult(CommandResult::Status::OK);
}