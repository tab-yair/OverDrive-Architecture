#include "communication/ClientServerComm.h"


ClientServerComm::ClientServerComm(int socket) : socket(socket) {}

std::string ClientServerComm::recieve() {
    char buffer[4096];
    memset(buffer, 0, sizeof(buffer));

    int expected_data_len = sizeof(buffer) - 1;
    int read_bytes = recv(socket, buffer, expected_data_len, 0);

    if (read_bytes <= 0) {
        return "";
    }

    buffer[read_bytes] = '\0';
    return std::string(buffer);
}

int ClientServerComm::send(std::string output) {
    int sent_bytes = ::send(socket, output.c_str(), output.length(), 0);
    return sent_bytes;
}