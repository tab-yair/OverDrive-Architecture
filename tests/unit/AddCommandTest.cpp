#include "gtest/gtest.h"
#include "AddCommand.h"
#include "MockFileManager.h"
#include <memory>
#include <vector>
#include <string>

/**
 * Test environment for AddCommand
 */
class AddCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<AddCommand> addCommand;

    void SetUp() override {
        // Dependency Injection – the command receives a mock instead of the real file manager
        mockFileManager = std::make_shared<MockFileManager>();
        addCommand = std::make_unique<AddCommand>(mockFileManager);
    }

    void TearDown() override {
        // Smart pointers clean themselves
    }
};

// Test 1: No arguments → nothing to do, no file creation
TEST_F(AddCommandTest, NoArguments_ReturnsNullOpt) {
    std::vector<std::string> args = {};
    auto result = addCommand->execute(args);

    EXPECT_FALSE(mockFileManager->createCalled);
    EXPECT_FALSE(result.has_value());
}

// Test 2: Single argument → create empty file
TEST_F(AddCommandTest, OneArgument_CreatesEmptyFile) {
    std::vector<std::string> args = {"hello.txt"};
    auto result = addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "hello.txt");
    EXPECT_TRUE(mockFileManager->lastCreatedContent.empty());
    EXPECT_FALSE(result.has_value());
}

// Test 3: Filename + single text argument → store text as-is
TEST_F(AddCommandTest, FilenameAndText_WritesExactData) {
    std::vector<std::string> args = {"note", "HELLO_WORLD"};
    auto result = addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "note");
    EXPECT_EQ(mockFileManager->lastCreatedContent, "HELLO_WORLD");
    EXPECT_FALSE(result.has_value());
}

// Test 4: Multi-word content → join with spaces
TEST_F(AddCommandTest, MultiWordText_JoinedCorrectly) {
    std::vector<std::string> args = {"msg", "this", "is", "a", "test", "message"};
    auto result = addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "msg");
    EXPECT_EQ(mockFileManager->lastCreatedContent, "this is a test message");
    EXPECT_FALSE(result.has_value());
}

// Test 5: If FileManager::create throws → exception should bubble up
TEST_F(AddCommandTest, CreateThrowsException_BubblesUp) {
    mockFileManager->throwOnCreate = true;
    std::vector<std::string> args = {"badfile.txt", "data"};

    EXPECT_THROW(addCommand->execute(args), std::runtime_error);
    EXPECT_TRUE(mockFileManager->createCalled);
}

// Test 6: If AddCommand constructed with nullptr → should not crash
TEST_F(AddCommandTest, NullFileManager_NoCrash) {
    AddCommand cmd(nullptr);
    std::vector<std::string> args = {"file", "data"};

    EXPECT_NO_THROW(cmd.execute(args));

    // Ensure the mock in this fixture was not affected
    EXPECT_FALSE(mockFileManager->createCalled);
}
