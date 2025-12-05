#include <gtest/gtest.h>
#include <memory>
#include <vector>
#include <thread>
#include <chrono>
#include <atomic>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>

#include "server/server.h"
#include "threading/IThreadManager.h"
#include "handlers/IClientHandlerFactory.h"
#include "handlers/ClientHandler.h"
#include "handlers/ClientContext.h"
#include "threading/IRunnable.h"

// Mock Runnable that tracks if it was run
class MockRunnable : public IRunnable {
public:
    std::atomic<bool>& wasRun;
    int clientId;
    int clientSocket;

    MockRunnable(std::atomic<bool>& runFlag, int id, int sock)
        : wasRun(runFlag), clientId(id), clientSocket(sock) {}

    void run() override {
        wasRun = true;
        // Close the socket after handling
        close(clientSocket);
    }

    ~MockRunnable() override = default;
};

// Mock ThreadManager that tracks started threads
class MockThreadManager : public IThreadManager {
public:
    std::vector<std::unique_ptr<IRunnable>> startedTasks;
    std::atomic<int> threadCount{0};

    void startThread(std::unique_ptr<IRunnable> task) override {
        threadCount++;
        // Run the task in a new thread (simulating real behavior)
        IRunnable* rawTask = task.release();
        std::thread([rawTask]() {
            rawTask->run();
            delete rawTask;
        }).detach();
    }

    ~MockThreadManager() override = default;
};

// Mock ClientHandlerFactory that creates MockRunnables
class MockClientHandlerFactory : public IClientHandlerFactory {
public:
    std::atomic<bool>& handlerCreated;
    std::atomic<bool>& handlerRun;
    std::vector<ClientContext> createdContexts;

    MockClientHandlerFactory(std::atomic<bool>& created, std::atomic<bool>& run)
        : handlerCreated(created), handlerRun(run) {}

    std::unique_ptr<ClientHandler> create(const ClientContext& context) override {
        handlerCreated = true;
        // We can't return a real ClientHandler, so we return nullptr
        // But the test will use a different approach
        return nullptr;
    }

    ~MockClientHandlerFactory() override = default;
};

// Custom factory that returns IRunnable (to match actual usage)
class TestClientHandlerFactory : public IClientHandlerFactory {
public:
    std::atomic<int>& createCount;
    std::atomic<bool>& handlerRun;
    std::vector<int> clientIds;
    std::vector<int> clientSockets;

    TestClientHandlerFactory(std::atomic<int>& count, std::atomic<bool>& run)
        : createCount(count), handlerRun(run) {}

    std::unique_ptr<ClientHandler> create(const ClientContext& context) override {
        createCount++;
        clientIds.push_back(context.clientId);
        clientSockets.push_back(context.clientSocket);
        // Close socket since we're not actually handling it
        close(context.clientSocket);
        return nullptr;
    }

    ~TestClientHandlerFactory() override = default;
};

// Helper function to connect a client to the server
int connectToServer(int port) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return -1;

    struct sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr);

    if (connect(sock, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        close(sock);
        return -1;
    }

    return sock;
}

// Test: Server constructor initializes members correctly
TEST(ServerTest, ConstructorInitializesMembers) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    // Server should be constructible
    Server server(threadManager, factory, 5555);

    // No assertions needed - if constructor works, test passes
    SUCCEED();
}

// Test: Server accepts client connection and creates handler
TEST(ServerTest, AcceptsClientAndCreatesHandler) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    int testPort = 5556;
    Server server(threadManager, factory, testPort);

    // Start server in a separate thread
    std::thread serverThread([&server]() {
        server.start();
    });

    // Give server time to start listening
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Connect a client
    int clientSock = connectToServer(testPort);
    ASSERT_GE(clientSock, 0) << "Failed to connect to server";

    // Give server time to accept and create handler
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Verify handler was created
    EXPECT_EQ(createCount, 1);

    // Cleanup
    close(clientSock);
    serverThread.detach();
}

// Test: Server assigns incrementing client IDs
TEST(ServerTest, AssignsIncrementingClientIds) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    int testPort = 5557;
    Server server(threadManager, factory, testPort);

    // Start server in a separate thread
    std::thread serverThread([&server]() {
        server.start();
    });

    // Give server time to start listening
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Connect multiple clients
    int client1 = connectToServer(testPort);
    ASSERT_GE(client1, 0);
    std::this_thread::sleep_for(std::chrono::milliseconds(50));

    int client2 = connectToServer(testPort);
    ASSERT_GE(client2, 0);
    std::this_thread::sleep_for(std::chrono::milliseconds(50));

    int client3 = connectToServer(testPort);
    ASSERT_GE(client3, 0);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Verify 3 handlers were created
    EXPECT_EQ(createCount, 3);

    // Verify client IDs are incrementing (1, 2, 3)
    ASSERT_EQ(factory->clientIds.size(), 3);
    EXPECT_EQ(factory->clientIds[0], 1);
    EXPECT_EQ(factory->clientIds[1], 2);
    EXPECT_EQ(factory->clientIds[2], 3);

    // Cleanup
    close(client1);
    close(client2);
    close(client3);
    serverThread.detach();
}

// Test: Server starts thread for each client
TEST(ServerTest, StartsThreadForEachClient) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    int testPort = 5558;
    Server server(threadManager, factory, testPort);

    // Start server in a separate thread
    std::thread serverThread([&server]() {
        server.start();
    });

    // Give server time to start listening
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Connect multiple clients
    int client1 = connectToServer(testPort);
    int client2 = connectToServer(testPort);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Verify thread manager started threads
    EXPECT_EQ(threadManager->threadCount, 2);

    // Cleanup
    if (client1 >= 0) close(client1);
    if (client2 >= 0) close(client2);
    serverThread.detach();
}

// Test: Server passes correct socket to handler
TEST(ServerTest, PassesCorrectSocketToHandler) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    int testPort = 5559;
    Server server(threadManager, factory, testPort);

    // Start server in a separate thread
    std::thread serverThread([&server]() {
        server.start();
    });

    // Give server time to start listening
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Connect a client
    int clientSock = connectToServer(testPort);
    ASSERT_GE(clientSock, 0);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Verify socket was passed (should be a valid file descriptor > 0)
    ASSERT_EQ(factory->clientSockets.size(), 1);
    EXPECT_GT(factory->clientSockets[0], 0);

    // Cleanup
    close(clientSock);
    serverThread.detach();
}

// Test: Server handles multiple concurrent connections
TEST(ServerTest, HandlesMultipleConcurrentConnections) {
    std::atomic<int> createCount{0};
    std::atomic<bool> handlerRun{false};

    auto threadManager = std::make_shared<MockThreadManager>();
    auto factory = std::make_shared<TestClientHandlerFactory>(createCount, handlerRun);

    int testPort = 5560;
    Server server(threadManager, factory, testPort);

    // Start server in a separate thread
    std::thread serverThread([&server]() {
        server.start();
    });

    // Give server time to start listening
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Connect 5 clients concurrently
    std::vector<std::thread> clientThreads;
    std::atomic<int> connectedCount{0};

    for (int i = 0; i < 5; i++) {
        clientThreads.emplace_back([testPort, &connectedCount]() {
            int sock = connectToServer(testPort);
            if (sock >= 0) {
                connectedCount++;
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
                close(sock);
            }
        });
    }

    // Wait for all clients to connect
    for (auto& t : clientThreads) {
        t.join();
    }

    // Give server time to process all connections
    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // Verify all handlers were created
    EXPECT_EQ(createCount, 5);
    EXPECT_EQ(connectedCount, 5);

    serverThread.detach();
}