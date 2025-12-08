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
    commandRegistry["POST"] = [this](std::shared_ptr<ClientContext> ctx) {
        return std::make_unique<PostCommand>(fileManager, ctx);
    };
    commandRegistry["GET"] = [this](std::shared_ptr<ClientContext> ctx) {
        return std::make_unique<GetCommand>(fileManager, ctx);
    };
    commandRegistry["DELETE"] = [this](std::shared_ptr<ClientContext> ctx) {
        return std::make_unique<DeleteCommand>(fileManager, ctx);
    };
    commandRegistry["SEARCH"] = [this](std::shared_ptr<ClientContext> ctx) {
        return std::make_unique<SearchCommand>(fileManager, ctx);
    };
}

std::map<std::string, std::unique_ptr<ICommand>> ClientCommandFactory::createCommands(std::shared_ptr<ClientContext> context) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    for (const auto& [name, creator] : commandRegistry) {
        commands[name] = creator(context);
    }
    return commands;
}
