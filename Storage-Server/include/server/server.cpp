#include "server/server.h"

Server::Server(std::shared_ptr<IThreadManager> tm,
               std::shared_ptr<IClientHandlerFactory> chf,
               int serverPort)
    : threadManager(tm), clientHandlerFactory(chf), port(serverPort) {}

void Server::start() {
    // Create TCP socket
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("error creating socket");
        return;
    }

    // Set up the server address structure
    struct sockaddr_in sin;
    memset(&sin, 0, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = INADDR_ANY;
    sin.sin_port = htons(port);

    // Bind the socket to the port
    if (bind(sock, (struct sockaddr *) &sin, sizeof(sin)) < 0) {
        perror("error binding socket");
        close(sock);
        return;
    }

    // Listen for incoming connections
    if (listen(sock, 5) < 0) {
        perror("error listening to a socket");
        close(sock);
        return;
    }

    int clientCounter = 0;

    // Infinite loop to accept clients
    while (true) {
        // Accept a client connection
        struct sockaddr_in client_sin;
        unsigned int addr_len = sizeof(client_sin);
        int client_sock = accept(sock, (struct sockaddr *) &client_sin, &addr_len);

        if (client_sock < 0) {
            continue;
        }

        // Create client context with unique ID
        ClientContext context;
        context.clientId = ++clientCounter;
        context.clientSocket = client_sock;

        // Create client handler via factory
        std::unique_ptr<IRunnable> handler = clientHandlerFactory->create(std::make_shared<ClientContext>(context));

        // Send handler to thread manager
        threadManager->startThread(std::move(handler));
    }
}
