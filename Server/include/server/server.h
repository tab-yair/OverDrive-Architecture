#ifndef SERVER_H
#define SERVER_H

// Server main header file
#include <memory>
#include "threading/IThreadManager.h"
#include "handlers/IClientHandlerFactory.h"

class Server {
private:
    std::shared_ptr<IThreadManager> threadManager;
    std::shared_ptr<IClientHandlerFactory> clientHandlerFactory;
    int port;

public:
    Server(std::shared_ptr<IThreadManager> tm,
           std::shared_ptr<IClientHandlerFactory> chf,
           int serverPort);

    void start();
};

#endif // SERVER_H