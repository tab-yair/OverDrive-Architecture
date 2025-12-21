#ifndef ICLIENT_HANDLER_FACTORY_H
#define ICLIENT_HANDLER_FACTORY_H

#include <memory>
#include "handlers/ClientHandler.h"

// Interface for creating ClientHandler instances
class IClientHandlerFactory {
public:
    // Virtual destructor to ensure proper cleanup of derived classes
    virtual ~IClientHandlerFactory() = default;
    
    // Creates a ClientHandler
    virtual std::unique_ptr<ClientHandler> create(int clientSocket) = 0;
};
#endif // ICLIENT_HANDLER_FACTORY_H