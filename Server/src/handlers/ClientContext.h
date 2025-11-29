#ifndef CLIENTCONTEXT_H
#define CLIENTCONTEXT_H

struct ClientContext {
    int clientId;        // Unique identifier for the client
    int clientSocket;    // Socket used for communication with the client
};

#endif // CLIENTCONTEXT_H