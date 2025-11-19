#include "gtest/gtest.h"
#include "../src/commands/AddCommand.h"
#include "mocks/MockFileManager.h" 
#include <memory>
#include <string>
#include <vector>
#include <algorithm>
#include <cstdlib>
#include <stdexcept>

/**
 * test environment setup for AddCommand tests
 */
class AddCommandTest : public ::testing::Test {
protected:
    // The mock object is stored as its specific type (MockFileManager)
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<AddCommand> addCommand;
    
    // Runs before every single test case
    void SetUp() override {
        // Dependency Injection: Create the mock objects and pass them to the command.
        mockFileManager = std::make_shared<MockFileManager>();
        
        // Since AddCommand expects shared_ptr<IFileManagement>, and MockFileManager inherits from it, this is correct.
        addCommand = std::make_unique<AddCommand>(mockFileManager); 
    }

    // Runs after every single test case
    void TearDown() override {
        // No environment cleanup is required because we use smart pointers.
    }
};

// Test 1: Verifies that the command returns nullopt and does not call 'create' when no arguments are provided.
TEST_F(AddCommandTest, NoArguments_ReturnsNullOpt) {
    std::vector<std::string> args = {};
    auto result = addCommand->execute(args);
    
    EXPECT_FALSE(mockFileManager->createCalled);
    EXPECT_FALSE(result.has_value()); 
}

// Test 2: Verifies that an empty file is created (empty content is passed to create) when only the filename is provided.
TEST_F(AddCommandTest, OneArgument_CreatesEmptyFile) {
    std::vector<std::string> args = {"hello.txt"};
    auto result = addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "hello.txt"); 
    // Expecting empty content, as no text was provided.
    EXPECT_TRUE(mockFileManager->lastCreatedContent.empty());
    EXPECT_FALSE(result.has_value()); 
}

// Test 3: Verifies that the command correctly passes the text AS IS (uncompressed) to the file writer.
TEST_F(AddCommandTest, FilenameAndText_WritesUncompressedData) {
    std::vector<std::string> args = {"note", "HELLO_WORLD"};
    auto result = addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "note");

    // The expected data is the original input string, since AddCommand no longer compresses.
    std::string expected = "HELLO_WORLD"; 
    EXPECT_EQ(mockFileManager->lastCreatedContent, expected);
    EXPECT_FALSE(result.has_value());
}

// Test 4: Verifies that multiple text arguments are joined by spaces before being passed to the file manager.
TEST_F(AddCommandTest, MultiWordText_JoinedCorrectly) {
    std::vector<std::string> args = {"msg", "this", "is", "a", "test", "message"};
    auto result = addCommand->execute(args);

    // Combined input: "this is a test message"
    std::string expected = "this is a test message"; 
    
    EXPECT_TRUE(mockFileManager->createCalled);
    EXPECT_EQ(mockFileManager->lastCreatedFilename, "msg");
    EXPECT_EQ(mockFileManager->lastCreatedContent, expected);
    EXPECT_FALSE(result.has_value());
}

// Test 5: Verifies that the command allows the file creation exception (from FileManager) to bubble up.
TEST_F(AddCommandTest, CreateThrowsException_BubblesUp) {
    // 1. Set the mock to throw the required runtime_error when 'create' is called.
    mockFileManager->throwOnCreate = true; 
    std::vector<std::string> args = {"badfile.txt", "data"};
    
    // 2. Expect the execute call to throw an exception, fulfilling the requirement for the Main Loop to handle I/O errors.
    EXPECT_THROW(addCommand->execute(args), std::runtime_error); 
    
    // 3. The 'create' function must have been called before the throw.
    EXPECT_TRUE(mockFileManager->createCalled); 
}


// Test 6: Verifies that the command gracefully handles null FileManager dependency (safety check).
TEST_F(AddCommandTest, NullFileManager_NoCrash) {
    // Test for nullptr fileManager (covers the first check in execute)
    // Note: The nullptr cast to std::shared_ptr<IFileManagement> works here.
    AddCommand cmd(nullptr); 
    std::vector<std::string> args = {"file", "data"};
    
    // Expect it to fail silently and not crash
    EXPECT_NO_THROW(cmd.execute(args));
    // Since we used a temporary command with nullptr, we check that the global mockFileManager was NOT called.
    EXPECT_FALSE(mockFileManager->createCalled); 
}