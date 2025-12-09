#include "Client.h"
#include <stdexcept>

Client::Client(std::unique_ptr<ICommunication> serverComm,
               std::unique_ptr<ICommunication> userComm)
    : server_comm(std::move(serverComm)),
      user_comm(std::move(userComm)) {}

void Client::run() {
    try {
        while (true) {
            std::string command = user_comm->recieve();
            
            server_comm->send(command);

            std::string response = server_comm->recieve();

            user_comm->send(response);
        }
    } catch (const std::runtime_error& e) {
        // EOF reached, exit gracefully
        return;
    }
}
