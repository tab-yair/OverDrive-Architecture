#ifndef COMMANDEXECUTOR_H
#define COMMANDEXECUTOR_H

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <stdexcept>
#include <memory>
#include "ICommand.h"
#include "IExecutor.h"

class CommandExecutor : public IExecutor {
private:
    std::map<std::string, std::unique_ptr<ICommand>> commands; 
public:
    // Constructor that accepts a map of command names to ICommand pointers
    CommandExecutor( std::map<std::string, std::unique_ptr<ICommand>> commands);
    // Executes the command with the given name and arguments.
    std::optional<std::string> execute(const std::string& name, const std::vector<std::string>& args) override;
};

#endif // COMMANDEXECUTOR_H
