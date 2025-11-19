#include "gtest/gtest.h"
#include "../src/commands/GetCommand.h"
#include "mocks/MockFileManager.h" 
#include <memory>
#include <string>
#include <vector>
#include <stdexcept>

/**
 * set test environment for GetCommand tests
 */
class GetCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<GetCommand> getCommand;
    
    // Runs before every single test case (TEST_F)
    void SetUp() override {
        // Dependency Injection: Create the mock and inject it into the command.
        mockFileManager = std::make_shared<MockFileManager>();
        getCommand = std::make_unique<GetCommand>(mockFileManager); 
    }

    // Runs after every single test case (TEST_F) - Empty for Mock tests.
    void TearDown() override {
        // No environment cleanup is required because of the use of smart pointers.
    }
};

// Test 1: Verifies that the command returns a usage error message when no filename is provided.
TEST_F(GetCommandTest, NoArguments_ReturnsErrorMessage) {
    std::vector<std::string> args = {};
    auto result = getCommand->execute(args);
    
    // The command should not attempt any file operation.
    EXPECT_FALSE(mockFileManager->existsCalled);
    
    // Expecting an error message instructing the user how to use the command.
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "Error: Missing filename. Usage: get [file_name]"); 
}

// Test 2: Verifies that the command returns an error if the specified file does not exist.
TEST_F(GetCommandTest, FileDoesNotExist_ReturnsErrorMessage) {
    // 1. Set the mock to report that the file does not exist.
    mockFileManager->existsReturnValue = false;
    std::vector<std::string> args = {"nonexistent.txt"};
    
    auto result = getCommand->execute(args);

    // 2. Verify existence check was made, but 'read' was NOT called.
    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_EQ(mockFileManager->lastCheckedPath, "nonexistent.txt");
    EXPECT_FALSE(mockFileManager->readCalled);

    // 3. Expect an error message.
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "Error: File 'nonexistent.txt' not found."); 
}

// Test 3: Verifies that a successful file read returns the content directly to the user.
TEST_F(GetCommandTest, SuccessfulRead_ReturnsFileContent) {
    // 1. Set up the mock to simulate a successful read.
    mockFileManager->existsReturnValue = true;
    const std::string fileContent = "This is the data stored in the file.";
    mockFileManager->readReturnValue = fileContent;
    std::vector<std::string> args = {"data.txt"};
    
    auto result = getCommand->execute(args);

    // 2. Verify all necessary calls: exists() followed by read().
    EXPECT_TRUE(mockFileManager->existsCalled);
    EXPECT_TRUE(mockFileManager->readCalled);
    EXPECT_EQ(mockFileManager->lastReadFilename, "data.txt");
    
    // 3. Expect the exact file content as the output.
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), fileContent); 
}

// Test 4: Verifies that exceptions thrown during the 'read' operation bubble up.
TEST_F(GetCommandTest, ReadThrowsException_BubblesUp) {
    // 1. Set the mock to throw an exception if 'read' is called.
    mockFileManager->existsReturnValue = true; // Must exist to reach the read call
    mockFileManager->throwOnRead = true; 
    std::vector<std::string> args = {"locked.txt"};
    
    // 2. Expect the execute call to throw an exception.
    EXPECT_THROW(getCommand->execute(args), std::runtime_error); 
    
    // 3. Verify that 'exists' and 'read' were called.
    EXPECT_TRUE(mockFileManager->existsCalled); 
    EXPECT_TRUE(mockFileManager->readCalled);
}

// Test 5: Verifies that the command gracefully handles a null IFileManagement dependency.
TEST_F(GetCommandTest, NullFileManager_NoCrash_ReturnsNullOpt) {
    // We create a new command instance with a nullptr dependency.
    GetCommand cmd(nullptr); 
    std::vector<std::string> args = {"file.txt"};
    
    // Expect it to execute safely and return no output (or a specific error, depending on the implementation).
    // In our case, we'll aim for no crash and an empty return (nullopt) or an error. 
    // Since we don't have the implementation yet, we'll assume the safest: no crash.
    auto result = cmd.execute(args);
    
    EXPECT_NO_THROW(cmd.execute(args));
    // It should not interact with the global mockFileManager instance.
    EXPECT_FALSE(mockFileManager->existsCalled);
    // Since AddCommand returned nullopt on null dependency, we'll assume GetCommand does too.
    EXPECT_FALSE(result.has_value()); 
}