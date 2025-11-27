#include "commands/ClientCommandFactory.h"
#include "commands/PostCommand.h"
#include "commands/GetCommand.h"
#include "commands/SearchCommand.h"

ClientCommandFactory::ClientCommandFactory(std::shared_ptr<FileManager> fm) 
    : fileManager(fm) 
{
    registerCommands();
}

void ClientCommandFactory::registerCommands() {
    commandRegistry["POST"] = [this](const ClientContext& ctx) {
        return std::make_unique<PostCommand>(ctx, fileManager);
    };
    commandRegistry["GET"] = [this](const ClientContext& ctx) {
        return std::make_unique<GetCommand>(ctx, fileManager);
    };
    commandRegistry["DELETE"] = [this](const ClientContext& ctx) {
        return std::make_unique<DeleteCommand>(ctx, fileManager);
    };
    commandRegistry["SEARCH"] = [this](const ClientContext& ctx) {
        return std::make_unique<SearchCommand>(ctx, fileManager);
    };
}

std::map<std::string, std::unique_ptr<ICommand>> ClientCommandFactory::createCommands(const ClientContext& context) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    for (const auto& [name, creator] : commandRegistry) {
        commands[name] = creator(context);
    }
    return commands;
}
