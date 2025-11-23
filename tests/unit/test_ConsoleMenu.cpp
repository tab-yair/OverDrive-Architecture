#include <gtest/gtest.h>
#include <sstream>
#include "ConsoleMenu.h"



// ============================================================
// TEST FIXTURE WITH HELPER FUNCTIONS
// ============================================================

class ConsoleMenuTest : public ::testing::Test {
protected:
    ConsoleMenu* menu;
    std::stringstream testInput;
    std::stringstream testOutput;
    std::streambuf* oldCin;
    std::streambuf* oldCout;
    
    // redirecting cin/cout to stringstreams for testing
    void SetUp() override {
        menu = new ConsoleMenu();
        oldCin = std::cin.rdbuf(testInput.rdbuf());
        oldCout = std::cout.rdbuf(testOutput.rdbuf());
    }
    
    //restoring original cin/cout
    void TearDown() override {
        std::cin.rdbuf(oldCin);
        std::cout.rdbuf(oldCout);
        delete menu;
    }
    
    // ============================================================
    // HELPER: Test that input produces expected command string vector
    // ============================================================

    
    void testCommandInput(
        const std::string& input,
        const std::string& expectedString)
    {
        // set the input - add a newline to simulate Enter key press
        testInput.str(input + "\n");
        testInput.clear();

        std::string result = menu->nextCommand();

        EXPECT_EQ(result, expectedString);

    }
    
    // Helper for testing output
    void testCommandOutput(
        const std::string& message,
        const std::string& expectedOutput,
        int expectedReturnValue = 0)
    {
        // Clear previous output
        testOutput.str("");
        testOutput.clear();
        
        int result = menu->handleOutput(message);
        
        EXPECT_EQ(result, expectedReturnValue);
        EXPECT_EQ(testOutput.str(), expectedOutput);
    }
};


// ============================================================
// UNIT TESTS - testing input and output methods
// ============================================================
// ========== Input Tests ==========

// Verifies menu correctly reads and returns a simple command with argument
TEST_F(ConsoleMenuTest, BasicCommand) {
    testCommandInput("upload file.txt", "upload file.txt");
}

// Verifies menu correctly handles empty input from user
TEST_F(ConsoleMenuTest, EmptyInput) {
    testCommandInput("", "");
}

// Verifies menu correctly handles commands with multiple space-separated words
TEST_F(ConsoleMenuTest, CommandWithSpaces) {
    testCommandInput("list all files", "list all files");
}

// Verifies menu correctly handles input containing file paths and special characters
TEST_F(ConsoleMenuTest, CommandWithSpecialCharacters) {
    testCommandInput("download /path/to/file-v2.0.txt", 
                    "download /path/to/file-v2.0.txt");
}

// Verifies menu can handle extremely long input strings (1000 characters)
TEST_F(ConsoleMenuTest, VeryLongInput) {
    std::string longInput(1000, 'a');
    testCommandInput(longInput, longInput);
}

// ========== Output Tests ==========

// Verifies menu correctly displays a simple success message with newline
TEST_F(ConsoleMenuTest, BasicOutput) {
    testCommandOutput("File uploaded successfully", 
                     "File uploaded successfully\n");
}

// Verifies menu correctly handles empty output messages
TEST_F(ConsoleMenuTest, EmptyOutput) {
    testCommandOutput("", "\n");
}

// Verifies menu correctly displays multiline output with preserved formatting
TEST_F(ConsoleMenuTest, MultilineOutput) {
    testCommandOutput("Line 1\nLine 2\nLine 3", 
                     "Line 1\nLine 2\nLine 3\n");
}

// Verifies menu correctly displays messages containing special characters
TEST_F(ConsoleMenuTest, OutputWithSpecialCharacters) {
    testCommandOutput("Success! @#$%", "Success! @#$%\n");
}

// Verifies menu can handle extremely long output strings (5000 characters)
TEST_F(ConsoleMenuTest, VeryLongOutput) {
    std::string longOutput(5000, 'x');
    testCommandOutput(longOutput, longOutput + "\n");
}