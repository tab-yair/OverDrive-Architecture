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

     // Convert name to uppercase
    std::string upper_name = name;
    std::transform(upper_name.begin(), upper_name.end(), upper_name.begin(),
                   [](unsigned char c){ return std::toupper(c); });

    try {
        auto& cmd = commands.at(upper_name);
        
        // If command pointer in the map is null, throw an error
        if (cmd == nullptr) {
            throw std::runtime_error("Command '" + name + "' is not initialized");
        }
        
        // Execute the command with the provided arguments, pass on the result
        return cmd->execute(args);
        
    } catch (const std::out_of_range&) {
        // Convert generic map exception to more descriptive one
        throw std::invalid_argument("Unknown command: " + name);
    }
}