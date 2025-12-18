#ifndef COMMAND_FACTORY_H
#define COMMAND_FACTORY_H

#include "commands/ICommand.h"
#include <map>
#include <string>
#include <memory>

class ICommandFactory {
public:
    // Creates all commands
    virtual std::map<std::string, std::unique_ptr<ICommand>> createCommands() = 0;

    // Virtual destructor to ensure proper cleanup of derived classes
    virtual ~ICommandFactory() = default;

};

#endif // COMMAND_FACTORY_H