#include "gtest/gtest.h"
#include "commands/DeleteCommand.h"
#include "mocks/MockFileManager.h"
#include <memory>
#include <vector>
#include <string>

/**
 * Test fixture for DeleteCommand
 */
class DeleteCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<DeleteCommand> deleteCommand;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        deleteCommand = std::make_unique<DeleteCommand>(mockFileManager);
    }
};

/* TEST CASES */

// No arguments → BAD_REQUEST
TEST_F(DeleteCommandTest, NoArguments_ReturnsBadRequest) {
    std::vector<std::string> args = {};
    auto result = deleteCommand->execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
    EXPECT_FALSE(mockFileManager->existsCalled);
    EXPECT_FALSE(mockFileManager->removeCalled);
}

// Null fileManager → BAD_REQUEST
TEST_F(DeleteCommandTest, NullFileManager_ReturnsBadRequest) {
    DeleteCommand cmd(nullptr);
    std::vector<std::string> args = {"a.txt"};

    auto result = cmd.execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
}

// File does not exist → NOT_FOUND
TEST_F(DeleteCommandTest, FileDoesNotExist_ReturnsNotFound) {
    mockFileManager->existsReturnValue = false;

    std::vector<std::string> args = {"missing.txt"};
    auto result = deleteCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_EQ(mockFileManager->lastCheckedPath, "missing.txt");
    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}

// File exists → remove() called → return NO_CONTENT
TEST_F(DeleteCommandTest, FileExists_RemoveSuccess_ReturnsNoContent) {
    mockFileManager->existsReturnValue = true;

    std::vector<std::string> args = {"del.txt"};
    auto result = deleteCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->removeCalled);

    EXPECT_EQ(mockFileManager->lastRemovedFilename, "del.txt");

    EXPECT_EQ(result.status, CommandResult::Status::NO_CONTENT);
}

// remove() throws exception → NOT_FOUND
TEST_F(DeleteCommandTest, RemoveThrows_ReturnsNotFound) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->throwOnRemove = true;

    std::vector<std::string> args = {"error.txt"};
    auto result = deleteCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->removeCalled);

    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}
