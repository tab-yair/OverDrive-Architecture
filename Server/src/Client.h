#ifndef CLIENT_H
#define CLIENT_H

#include "ICommunication.h"
#include <memory>

class Client {
public:
    Client(std::unique_ptr<ICommunication> serverComm,
           std::unique_ptr<ICommunication> userComm;

    void run();

private:
    std::unique_ptr<ICommunication> server_comm;
    std::unique_ptr<ICommunication> user_comm;
};

#endif // CLIENT_H
