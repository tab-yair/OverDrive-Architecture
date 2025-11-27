#ifndef CLIENTSERVERCOMM_H
#define CLIENTSERVERCOMM_H

#include <string>
#include "communication/ICommunication.h"

class ClientServerComm : public ICommunication {
public:
    ClientServerComm(int clientSocket);
    std::string recive() override;
    int send(std::string output) override;
private:
    int clientSocket;
};

#endif // CLIENTSERVERCOMM_H