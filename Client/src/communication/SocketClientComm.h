#ifndef SOCKETCLIENTCOMM_H
#define SOCKETCLIENTCOMM_H

#include "../../../Common\include\communication\ICommunication.h"
#include <string>

class SocketClientComm : public ICommunication {
private:
    int socket_fd;
    bool connected;

public:
    // Constructor: connects to server with given IP and port
    SocketClientComm(const std::string& server_ip, int port);
    
    // Destructor: closes the socket connection
    ~SocketClientComm();
    
    // Receives data from server
    std::string recive() override;
    
    // Sends data to server (automatically adds \n at the end)
    int send(std::string output) override;
    
    // Check if connection is active
    bool isConnected() const;
};

#endif // SOCKETCLIENTCOMM_H