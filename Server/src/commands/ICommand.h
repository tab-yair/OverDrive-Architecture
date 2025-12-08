#ifndef ICOMMAND_H
#define ICOMMAND_H

#include <vector>
#include <string>
#include "protocol/CommandResult.h"

// Abstract interface for all CLI commands
class ICommand {
public:
    // Virtual destructor to ensure proper cleanup
    virtual ~ICommand() = default;

    // Executes the command with the given arguments.
    // Example: add [file] [text], get [file], search [text].
    virtual CommandResult execute(const std::vector<std::string>& args) = 0;
};

#endif // ICOMMAND_H
