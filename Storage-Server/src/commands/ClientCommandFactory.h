#ifndef CLIENT_COMMAND_FACTORY_H
#define CLIENT_COMMAND_FACTORY_H

#include "commands/ICommandFactory.h"
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"
#include <map>
#include <string>
#include <memory>
#include <functional>

class ClientCommandFactory : public ICommandFactory {
private:
    std::shared_ptr<IFileManagement> fileManager;

    using CommandCreator = std::function<std::unique_ptr<ICommand>()>;
    std::map<std::string, CommandCreator> commandRegistry;

    void registerCommands(); 

public:
    explicit ClientCommandFactory(std::shared_ptr<IFileManagement> fm); 

    std::map<std::string, std::unique_ptr<ICommand>> createCommands() override;
};

#endif // CLIENT_COMMAND_FACTORY_H
