#ifndef SERVER_H
#define SERVER_H

// Server main header file
#include <memory>
#include <iostream>
#include <sys/socket.h>
#include <stdio.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include "threading/IThreadManager.h"
#include "handlers/IClientHandlerFactory.h"
#include "handlers/ClientContext.h"


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