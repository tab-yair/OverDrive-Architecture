#include "gtest/gtest.h"
#include "commands/GetCommand.h"
#include "mocks/MockFileManager.h"
#include <memory>
#include <string>
#include <vector>
#include <stdexcept>

class GetCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<GetCommand> getCommand;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        getCommand = std::make_unique<GetCommand>(mockFileManager);
    }

    void TearDown() override {
        // No cleanup needed due to smart pointers
    }
};

// No arguments → returns nullopt, no file ops called
TEST_F(GetCommandTest, NoArguments_ReturnsNullOpt) {
    std::vector<std::string> args = {};
    auto result = getCommand->execute(args);

    EXPECT_FALSE(mockFileManager->existsCalled);
    EXPECT_FALSE(result.has_value());
}

// File does not exist → exists returns false, read not called, returns nullopt
TEST_F(GetCommandTest, FileDoesNotExist_ReturnsNullOpt) {
    mockFileManager->existsReturnValue = false;
    std::vector<std::string> args = {"nonexistent.txt"};

    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_EQ(mockFileManager->lastCheckedPath, "nonexistent.txt");
    EXPECT_FALSE(mockFileManager->readCalled);
    EXPECT_FALSE(result.has_value());
}

// File exists → read returns content, returned by execute
TEST_F(GetCommandTest, SuccessfulRead_ReturnsContent) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->readReturnValue = "File content here";
    std::vector<std::string> args = {"data.txt"};

    auto result = getCommand->execute(args);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->readCalled);
    EXPECT_EQ(mockFileManager->lastReadFilename, "data.txt");

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "File content here");
}

// Read throws exception → bubbles up
TEST_F(GetCommandTest, ReadThrowsException_BubblesUp) {
    mockFileManager->existsReturnValue = true;
    mockFileManager->throwOnRead = true;
    std::vector<std::string> args = {"locked.txt"};

    EXPECT_THROW(getCommand->execute(args), std::runtime_error);

    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->readCalled);
}

// Null fileManager dependency → no crash, returns nullopt
TEST_F(GetCommandTest, NullFileManager_NoCrash_ReturnsNullOpt) {
    GetCommand cmd(nullptr);
    std::vector<std::string> args = {"file.txt"};

    auto result = cmd.execute(args);

    EXPECT_FALSE(mockFileManager->existsCalled);
    EXPECT_FALSE(result.has_value());
}
