#include "executors/CommandExecutor.h"
#include <algorithm>


CommandExecutor::CommandExecutor(
    std::map<std::string, std::unique_ptr<ICommand>> commands)
    : commands(std::move(commands)) {}

// Executes the command with the given name and arguments.
CommandResult CommandExecutor::execute(
    const std::string& name,
    const std::vector<std::string>& args)     
{

    try {
        auto& cmd = commands.at(name);
        CommandResult result(CommandResult::Status::BAD_REQUEST);
        // If command pointer in the map is null (command is in the map but ptr is null), throw an error
        if (cmd == nullptr) {
            throw std::runtime_error("Command '" + name + "' is not initialized");
        }
        
        // Execute the command with the provided arguments, pass on the result
        return cmd->execute(args);
        
    } catch (const std::out_of_range&) {
        // Convert generic map exception to more descriptive one
        return CommandResult(CommandResult::Status::BAD_REQUEST);
    }
}