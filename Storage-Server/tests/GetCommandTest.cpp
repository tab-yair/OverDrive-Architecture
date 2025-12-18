#include "gtest/gtest.h"
#include "commands/GetCommand.h"
#include "mocks/MockFileManager.h"
#include <memory>
#include <vector>
#include <string>

/**
 * Test environment for GetCommand
 */
class GetCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<GetCommand> getCommand;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        getCommand = std::make_unique<GetCommand>(mockFileManager);
    }
};

// No arguments provided should return BAD_REQUEST
TEST_F(GetCommandTest, NoArguments_ReturnsBadRequest) {
    std::vector<std::string> args = {};
    auto result = getCommand->execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
    EXPECT_FALSE(mockFileManager->existsCalled);
    EXPECT_FALSE(mockFileManager->readCalled);
}

// Null fileManager pointer results in BAD_REQUEST without exceptions
TEST_F(GetCommandTest, NullFileManager_ReturnsBadRequest) {
    GetCommand cmd(nullptr);
    std::vector<std::string> args = {"file.txt"};

    auto result = cmd.execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
}

// File does not exist should return NOT_FOUND
TEST_F(GetCommandTest, FileDoesNotExist_ReturnsNotFound) {
    mockFileManager->existsReturnValue = false;

    std::vector<std::string> args = {"missing.txt"};
    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_EQ(mockFileManager->lastCheckedPath, "missing.txt");
    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}

// File exists and read is successful should return OK with content
TEST_F(GetCommandTest, FileExists_ReadSuccess_ReturnsContent) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->readReturnValue = "Hello World";

    std::vector<std::string> args = {"test.txt"};
    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->readCalled);

    EXPECT_EQ(mockFileManager->lastCheckedPath, "test.txt");
    EXPECT_EQ(mockFileManager->lastFileName, "test.txt");

    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "Hello World");
}

// Read operation throws an exception should return NOT_FOUND
TEST_F(GetCommandTest, ReadThrows_ReturnsNotFound) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->throwOnRead = true;

    std::vector<std::string> args = {"error.txt"};
    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->readCalled);

    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}

// Verify that the correct clientId is passed to fileManager methods
TEST_F(GetCommandTest, PassesCorrectClientIdToFileManager) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->readReturnValue = "data";

    std::vector<std::string> args = {"abc.txt"};
    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->readCalled);
    EXPECT_EQ(mockFileManager->lastClientId, "1");
    EXPECT_EQ(result.status, CommandResult::Status::OK);
}
