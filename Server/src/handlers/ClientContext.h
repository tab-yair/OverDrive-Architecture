#ifndef CLIENTCONTEXT_H
#define CLIENTCONTEXT_H

#include <string>

struct ClientContext {
    std::string clientId;  // Unique identifier for the client
    int clientSocket;      // Socket used for communication with the client
};

#endif // CLIENTCONTEXT_H