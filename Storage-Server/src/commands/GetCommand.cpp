#include "commands/GetCommand.h"
#include <utility>      
#include <stdexcept>    

/**
 * GetCommand constructor.
 */
GetCommand::GetCommand(std::shared_ptr<IFileManagement> fileManager)
    : fileManager(std::move(fileManager)) {}


/**
 * Executes the 'get' command. It reads the content of the specified file and returns it as output.
 */
CommandResult GetCommand::execute(const std::vector<std::string>& args) {
    
    // if missing dependencies, stop immediately
    if (!fileManager) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    // Validate arguments: expecting exactly one argument (the file name)
    if (args.size() != 1) {
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }

    const std::string& fileName = args[0];

    // Check if the file exists before attempting to read
    if (!fileManager->exists(fileName)) {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }

    // Attempt to read the file content
    try {
        // The read operation might throw exceptions (I/O, permissions) which will be caught here
        std::string fileContent = fileManager->read(fileName);
        
        return CommandResult(CommandResult::Status::OK, fileContent);

    } catch (const std::exception& e) {
        return CommandResult(CommandResult::Status::NOT_FOUND);
    }
}