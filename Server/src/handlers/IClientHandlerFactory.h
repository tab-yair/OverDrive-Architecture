#ifndef ICLIENT_HANDLER_FACTORY_H
#define ICLIENT_HANDLER_FACTORY_H

#include <memory>
#include "handlers/ClientHandler.h"

// Interface for creating ClientHandler instances
class IClientHandlerFactory {
public:
    // Virtual destructor to ensure proper cleanup of derived classes
    virtual ~IClientHandlerFactory() = default;
    
    // Creates a ClientHandler based on the given ClientContext
    virtual std::unique_ptr<ClientHandler> create(const ClientContext& context) = 0;
};
#endif // ICLIENT_HANDLER_FACTORY_H