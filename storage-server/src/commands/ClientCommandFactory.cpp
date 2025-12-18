#include "commands/ClientCommandFactory.h"
#include "commands/PostCommand.h"
#include "commands/GetCommand.h"
#include "commands/SearchCommand.h"
#include "commands/DeleteCommand.h"

ClientCommandFactory::ClientCommandFactory(std::shared_ptr<IFileManagement> fm) 
    : fileManager(fm) 
{
    registerCommands();
}

void ClientCommandFactory::registerCommands() {
    commandRegistry["POST"] = [this]() {
        return std::make_unique<PostCommand>(fileManager);
    };
    commandRegistry["GET"] = [this]() {
        return std::make_unique<GetCommand>(fileManager);
    };
    commandRegistry["DELETE"] = [this]() {
        return std::make_unique<DeleteCommand>(fileManager);
    };
    commandRegistry["SEARCH"] = [this]() {
        return std::make_unique<SearchCommand>(fileManager);
    };
}

std::map<std::string, std::unique_ptr<ICommand>> ClientCommandFactory::createCommands() {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    for (const auto& [name, creator] : commandRegistry) {
        commands[name] = creator();
    }
    return commands;
}
