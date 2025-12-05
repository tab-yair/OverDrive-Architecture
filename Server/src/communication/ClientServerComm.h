#ifndef CLIENTSERVERCOMM_H
#define CLIENTSERVERCOMM_H

#include <string>
#include <sys/socket.h>
#include <string.h>
#include "communication/ICommunication.h"

class ClientServerComm : public ICommunication {
public:
    ClientServerComm(int socket);
    std::string recieve() override;
    int send(std::string output) override;
private:
    int socket;
};

#endif // CLIENTSERVERCOMM_H