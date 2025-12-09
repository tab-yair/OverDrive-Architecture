#include "communication/ClientServerComm.h"
#include <cstring>
#include <stdexcept>
#include <string>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>

ClientServerComm::ClientServerComm(int sock) 
    : socket(sock), owns_socket(false), is_connected(true) {}

ClientServerComm::ClientServerComm(const std::string& ip, int port)
    : owns_socket(true), is_connected(false) 
{
    socket = ::socket(AF_INET, SOCK_STREAM, 0);
    if (socket < 0) {
        throw std::runtime_error("Failed to create socket");
    }

    // Set up the server address structure
    struct sockaddr_in sin;
    memset(&sin, 0, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_port = htons(port);
    
    // First try as IP address
    if (inet_pton(AF_INET, ip.c_str(), &sin.sin_addr) > 0) {
        // It's a valid IP address, connect directly
        if (connect(socket, (struct sockaddr*)&sin, sizeof(sin)) < 0) {
            ::close(socket);
            throw std::runtime_error("Failed to connect to server");
        }
        is_connected = true;
        return;
    }
    
    // Connect to server
    if (connect(socket, (struct sockaddr*)&sin, sizeof(sin)) < 0) {
        ::close(socket);
        throw std::runtime_error("Failed to connect to server");
    }

    is_connected = true;
}

ClientServerComm::~ClientServerComm() {
    if (owns_socket && socket >= 0) {
        ::close(socket);
        socket = -1;
        is_connected = false;
    }
}

void ClientServerComm::close() {
    if (socket >= 0) {
        ::close(socket);
        socket = -1;
        is_connected = false;
    }
}

int ClientServerComm::send(std::string output) {
    size_t original_size = output.size();
    
    // Add newline delimiter
    output += "\n";
    
    size_t total_sent = 0;
    const char* data = output.c_str();
    size_t to_send = output.size();

    while (total_sent < to_send) {
        int sent_bytes = ::send(socket, data + total_sent, to_send - total_sent, 0);
        if (sent_bytes <= 0) {
            is_connected = false;
            return sent_bytes;
        }
        total_sent += sent_bytes;
    }

    // Return original size without the added newline
    return static_cast<int>(original_size);
}

std::string ClientServerComm::recieve() {
    std::string result;
    char buffer[1024];

    while (true) {
        int read_bytes = recv(socket, buffer, sizeof(buffer) - 1, 0);
        if (read_bytes <= 0) {
            is_connected = false;
            break;
        }
        buffer[read_bytes] = '\0';
        result += buffer;

        if (!result.empty() && result.back() == '\n') {
            // Remove the newline delimiter
            result.pop_back();
            break;
        }
    }

    return result;
}
