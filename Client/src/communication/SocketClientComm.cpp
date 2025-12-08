#include "communication/SocketClientComm.h"
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstring>
#include <stdexcept>
#include <errno.h>
#include <sys/time.h> // For timeval struct

// Define constants for robust operation
#define BUFFER_SIZE 4096
#define TIMEOUT_SEC 0
#define TIMEOUT_USEC 500000 // 0.5 seconds

SocketClientComm::SocketClientComm(const std::string& server_ip, int port) 
    : socket_fd(-1), connected(false) {
    
    // Create socket
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd < 0) { // if socket creation failed
        throw std::runtime_error("Failed to create socket");
    }
    
    // Setup server address structure
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    
    // Convert IP address from text to binary
    if (inet_pton(AF_INET, server_ip.c_str(), &server_addr.sin_addr) <= 0) {
        close(socket_fd);
        throw std::runtime_error("Invalid IP address");
    }
    
    // Connect to server
    if (connect(socket_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        close(socket_fd);
        throw std::runtime_error("Failed to connect to server");
    }
    
    // Set a short receive timeout. This is necessary for reliable reading of multi-line responses on a persistent connection.
    struct timeval tv;
    tv.tv_sec = TIMEOUT_SEC;
    tv.tv_usec = TIMEOUT_USEC; // 0.5 seconds
    
    if (setsockopt(socket_fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv)) < 0) {
        // Failed to set socket options, but we can still proceed
    }
    
    connected = true; // Successfully connected
}

// Destructor: closes the socket connection
SocketClientComm::~SocketClientComm() {
    if (socket_fd >= 0) {
        close(socket_fd);
    }
}

std::string SocketClientComm::recive() {
    if (!connected) {
        return "";
    }
    
    std::string full_response;
    char buffer[BUFFER_SIZE];
    
    // Loop to read all available data until a timeout occurs.
    while (true) {
        // Try to read data from the socket
        ssize_t bytes_received = recv(socket_fd, buffer, sizeof(buffer) - 1, 0);
        
        if (bytes_received > 0) {
            // Data received successfully. Append to the total response.
            full_response.append(buffer, bytes_received);
            
            // Continue the loop to check for more data
        } 
        else if (bytes_received == 0) {
            // bytes_received == 0 means thr connection was closed by the server
            connected = false;
            break;
        } 
        else { 
            // bytes_received < 0: An error occurred or timeout happened
            
            // Check if the error is EWOULDBLOCK or EAGAIN (standard for timeout/non-blocking)
            if (errno == EWOULDBLOCK || errno == EAGAIN) {
                // This means a timeout occurred. This signals the expected end of the complete message block.
                break;
            } else {
                // Actual connection error
                connected = false;
                break;
            }
        }
    }
    
    if (!connected && full_response.empty()) {
        // Disconnected and received no data
        return "";
    }
    
    return full_response;
}

int SocketClientComm::send(std::string output) {
    if (!connected) {
        return -1;
    }
    
    // Add newline at the end since we assume the server is ready to read line-by-line.
    std::string message = output + "\n";
    
    // Send the message, make sure to turn massage into c-string.
    int bytes_sent = ::send(socket_fd, message.c_str(), message.length(), 0);
    
    if (bytes_sent <= 0) {
        // Sending failed or connection was lost
        connected = false;
    }
    
    return bytes_sent;
}

bool SocketClientComm::isConnected() const {
    return connected;
}