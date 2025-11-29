#ifndef IEXECUTOR_H
#define IEXECUTOR_H

#include <string>
#include <vector>
#include <map>
#include "commands/ICommand.h"
#include "protocol/CommandResult.h"

class IExecutor {
public:
    // Executes the command with the given name and arguments.
    virtual CommandResult execute(const std::string& name, const std::vector<std::string>& args) = 0;
};

#endif // IEXECUTOR_H
