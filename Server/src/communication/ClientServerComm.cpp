#include "ClientServerComm.h"
#include <cstring>
#include <stdexcept>
#include <arpa/inet.h>
#include <unistd.h>

ClientServerComm::ClientServerComm(int sock) 
    : socket(sock), owns_socket(false), is_connected(true) {}

ClientServerComm::ClientServerComm(const std::string& ip, int port)
    : owns_socket(true), is_connected(false) 
{
    socket = ::socket(AF_INET, SOCK_STREAM, 0);
    if (socket < 0) throw std::runtime_error("Failed to create socket");

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    if (inet_pton(AF_INET, ip.c_str(), &addr.sin_addr) <= 0) {
        ::close(socket);
        throw std::runtime_error("Invalid IP address");
    }

    if (connect(socket, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
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

    return static_cast<int>(total_sent);
}

std::string ClientServerComm::recive() {
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

        if (!result.empty() && result.back() == '\n') break;
    }

    return result;
}
