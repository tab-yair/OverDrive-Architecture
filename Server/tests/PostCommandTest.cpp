#include "gtest/gtest.h"
#include "commands/PostCommand.h"
#include "mocks/MockFileManager.h"
#include "handlers/ClientContext.h"
#include <memory>
#include <vector>
#include <string>

/**
 * Test environment for PostCommand
 */
class PostCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<PostCommand> postCommand;
    ClientContext testContext;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        testContext = {1, 10}; // clientId=1, socket=10
        postCommand = std::make_unique<PostCommand>(mockFileManager, testContext);
    }
};

// no arguments test case
TEST_F(PostCommandTest, NoArguments_ReturnsBadRequest) {
    std::vector<std::string> args = {};
    auto result = postCommand->execute(args);

    EXPECT_FALSE(mockFileManager->createCalled);
    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
}

// single argument test case
TEST_F(PostCommandTest, OneArgument_CreatesEmptyFile) {
    std::vector<std::string> args = {"hello.txt"};
    auto result = postCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastClientId, 1);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "hello.txt");
    EXPECT_TRUE(mockFileManager->lastCreatedContent.empty());
    EXPECT_EQ(result.status, CommandResult::Status::CREATED);
}

// filename and text test case
TEST_F(PostCommandTest, FilenameAndText_WritesExactData) {
    std::vector<std::string> args = {"note", "HELLO_WORLD"};
    auto result = postCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastClientId, 1); 
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "note");
    EXPECT_EQ(mockFileManager->lastCreatedContent, "HELLO_WORLD");
    EXPECT_EQ(result.status, CommandResult::Status::CREATED);
}

// multiple words test case
TEST_F(PostCommandTest, MultiWordText_JoinedCorrectly) {
    std::vector<std::string> args = {"msg", "this", "is", "a", "test", "message"};
    auto result = postCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastClientId, 1);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "msg");
    EXPECT_EQ(mockFileManager->lastCreatedContent,
              "this is a test message");
    EXPECT_EQ(result.status, CommandResult::Status::CREATED);
}

// exception during create test case
TEST_F(PostCommandTest, CreateThrowsException_ReturnsNotFound) {
    mockFileManager->throwOnCreate = true;
    std::vector<std::string> args = {"badfile.txt", "data"};

    auto result = postCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}

// null file manager test case
TEST_F(PostCommandTest, NullFileManager_NoCrash) {
    PostCommand cmd(nullptr, testContext);
    std::vector<std::string> args = {"file", "data"};

    auto result = cmd.execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
    EXPECT_FALSE(mockFileManager->createCalled);
}
