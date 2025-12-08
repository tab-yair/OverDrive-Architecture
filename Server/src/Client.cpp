#include "Client.h"

Client::Client(std::unique_ptr<ICommunication> serverComm,
               std::unique_ptr<ICommunication> userComm)
    : server_comm(std::move(serverComm)),
      user_comm(std::move(userComm)) {}

void Client::run() {
    while (true) {
        std::string command = user_comm->recive();
        if (command.empty()) break;

        if (server_comm->send(command) <= 0) break;

        std::string response = server_comm->recive();
        if (response.empty()) break;

        user_comm->send(response);
    }
}
