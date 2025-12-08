#include <gtest/gtest.h>
#include <sys/socket.h>
#include <string>

#include "communication/ClientServerComm.h"

// Test: Basic send and receive
TEST(ClientServerCommTest, BasicSendReceive) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        comm1.send("Hello");
        std::string msg = comm2.recieve();

        EXPECT_EQ(msg, "Hello");
    }
}

// Test: Send and receive in opposite direction
TEST(ClientServerCommTest, SendReceiveOppositeDirection) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        comm2.send("World");
        std::string msg = comm1.recieve();

        EXPECT_EQ(msg, "World");
    }
}

// Test: Send long message
TEST(ClientServerCommTest, SendLongMessage) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        std::string longMsg(1000, 'A');
        comm1.send(longMsg);
        std::string msg = comm2.recieve();

        EXPECT_EQ(msg, longMsg);
    }
}

// Test: Multiple sequential messages
TEST(ClientServerCommTest, MultipleMessages) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        comm1.send("First");
        std::string msg1 = comm2.recieve();
        EXPECT_EQ(msg1, "First");

        comm1.send("Second");
        std::string msg2 = comm2.recieve();
        EXPECT_EQ(msg2, "Second");

        comm1.send("Third");
        std::string msg3 = comm2.recieve();
        EXPECT_EQ(msg3, "Third");
    }
}

// Test: Bidirectional communication
TEST(ClientServerCommTest, BidirectionalCommunication) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        comm1.send("Ping");
        std::string msg1 = comm2.recieve();
        EXPECT_EQ(msg1, "Ping");

        comm2.send("Pong");
        std::string msg2 = comm1.recieve();
        EXPECT_EQ(msg2, "Pong");
    }
}

// Test: Send with special characters
TEST(ClientServerCommTest, SendSpecialCharacters) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        std::string special = "Hello\nWorld\t!@#$%^&*()";
        comm1.send(special);
        std::string msg = comm2.recieve();

        EXPECT_EQ(msg, special);
    }
}

// Test: Send returns number of bytes sent
TEST(ClientServerCommTest, SendReturnsByteCount) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        std::string message = "Hello";
        int sentBytes = comm1.send(message);

        EXPECT_EQ(sentBytes, 5);
    }
}

// Test: Receive returns empty string on closed connection
TEST(ClientServerCommTest, ReceiveOnClosedConnection) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    ClientServerComm comm2(sv[1]);
    
    // Close the other end
    close(sv[0]);
    
    // Should return empty on closed connection
    std::string msg = comm2.recieve();
    EXPECT_EQ(msg, "");
}

// Test: Send message with spaces
TEST(ClientServerCommTest, SendMessageWithSpaces) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        std::string message = "POST movie1 This is the content";
        comm1.send(message);
        std::string msg = comm2.recieve();

        EXPECT_EQ(msg, message);
    }
}

// Test: Constructor stores socket correctly
TEST(ClientServerCommTest, ConstructorStoresSocket) {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    {
        ClientServerComm comm1(sv[0]);
        ClientServerComm comm2(sv[1]);

        int result = comm1.send("test");
        EXPECT_GT(result, 0);
    }
}
