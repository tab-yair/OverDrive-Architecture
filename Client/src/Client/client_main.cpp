#include "Client.h"
#include "communication/ClientServerComm.h"
#include "communication/UserClientComm.h"
#include <memory>
#include <string>

int main(int argc, char* argv[]) {
    if (argc != 3) {
        // Usage error: missing IP or port
        // std::cerr << "Usage: " << argv[0] << " <server_ip> <port>" << std::endl;
        return 1;
    }

    std::string server_ip = argv[1];
    int port;
    try {
        port = std::stoi(argv[2]);
    } catch (...) {
        // Invalid port number
        // std::cerr << "Invalid port number: " << argv[2] << std::endl;
        return 1;
    }

    try {
        std::unique_ptr<ICommunication> serverComm =
            std::make_unique<ClientServerComm>(server_ip, port);

        std::unique_ptr<ICommunication> userComm =
            std::make_unique<UserClientComm>();

        Client client(std::move(serverComm), std::move(userComm));
        client.run();
    } catch (const std::exception& e) {
        // Error during client setup or connection
        // std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
