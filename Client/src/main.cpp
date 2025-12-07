#include "communication/SocketClientComm.h"
#include "communication/UserClientComm.h"
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    // Check if IP and port were provided
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <server_ip> <port>" << std::endl;
        return 1;
    }
    
    std::string server_ip = argv[1];
    int port;
    try
    {
        port = std::stoi(argv[2]);
    }
    catch(const std::exception& e)
    {
        std::cerr << "Invalid port number: " << argv[2] << std::endl;
        return 1;
    }
    
    try {
        // Create communication objects
        SocketClientComm server_comm(server_ip, port);
        UserClientComm user_comm;
        
        // Main loop: read from user, send to server, receive response, display to user
        while (server_comm.isConnected()) {
            // Read command from user
            std::string command = user_comm.recive();
            
            // Send command to server
            if (server_comm.send(command) <= 0) { // Error in sending
                break;
            }
            
            // Receive response from server
            std::string response = server_comm.recive();
            
            if (response.empty() && !server_comm.isConnected()) {
                break; // Disconnected
            }
            // Display response to user
            user_comm.send(response);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}