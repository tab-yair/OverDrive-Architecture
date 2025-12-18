#include "handlers/ClientHandlerFactory.h"
#include "executors/IExecutor.h"
#include "executors/CommandExecutor.h"
#include "communication/ClientServerComm.h"

ClientHandlerFactory::ClientHandlerFactory(std::shared_ptr<ICommandFactory> cmdFactory, std::shared_ptr<IParser> p)
    : commandFactory(cmdFactory), parser(p) {}

std::unique_ptr<ClientHandler> ClientHandlerFactory::create(int clientSocket) {
    std::map<std::string, std::unique_ptr<ICommand>> commandMap = commandFactory->createCommands();
    std::unique_ptr<IExecutor> executor = std::make_unique<CommandExecutor>(std::move(commandMap));
    std::unique_ptr<ICommunication> comm = std::make_unique<ClientServerComm>(clientSocket);
    return std::make_unique<ClientHandler>(std::move(comm), std::move(executor), parser);
}