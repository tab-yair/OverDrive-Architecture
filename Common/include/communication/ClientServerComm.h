#ifndef CLIENTSERVERCOMM_H
#define CLIENTSERVERCOMM_H

#include "communication/ICommunication.h"
#include <string>

class ClientServerComm : public ICommunication {
public:
    // Constructor for existing socket (server)
    ClientServerComm(int socket);

    // Constructor for client connection (IP + port)
    ClientServerComm(const std::string& ip, int port);

    ~ClientServerComm();

    std::string recieve() override;
    int send(std::string output) override;

    void close();
    bool connected() const { return is_connected; }

private:
    int socket;
    bool owns_socket;
    bool is_connected;
};

#endif // CLIENTSERVERCOMM_H
