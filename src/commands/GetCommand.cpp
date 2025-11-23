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
std::optional<std::string> GetCommand::execute(const std::vector<std::string>& args) {
    
    // if missing dependencies, stop immediately
    if (!fileManager) {
        // Return nullopt or a specific error message. We'll stick to nullopt for internal errors.
        return std::nullopt; 
    }

    // If no filename provided, stop immediately.
    if (args.empty()) {
        return std::nullopt;
    }

    const std::string& fileName = args[0];

    // Check if the file exists before attempting to read
    if (!fileManager->exists(fileName)) {
        return std::nullopt;
    }

    // Attempt to read the file content
    try {
        // The read operation might throw exceptions (I/O, permissions) which will be caught here
        std::string fileContent = fileManager->read(fileName);
        
        return fileContent;

    } catch (const std::exception& e) {
        // Re-throw the exception for the main loop to handle I/O errors.
        throw; 
    }
}