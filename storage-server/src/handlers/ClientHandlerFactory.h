#ifndef CLIENT_HANDLER_FACTORY_H
#define CLIENT_HANDLER_FACTORY_H

#include "handlers/IClientHandlerFactory.h"
#include "commands/ICommandFactory.h"
#include "parsers/IParser.h"
#include "handlers/ClientHandler.h"

class ClientHandlerFactory : public IClientHandlerFactory {
private:
    std::shared_ptr<ICommandFactory> commandFactory;
    std::shared_ptr<IParser> parser;

public:
    ClientHandlerFactory(std::shared_ptr<ICommandFactory> cmdFactory, std::shared_ptr<IParser> p);

    // Creates a ClientHandler
    std::unique_ptr<ClientHandler> create(int clientSocket) override;
};

#endif // CLIENT_HANDLER_FACTORY_H