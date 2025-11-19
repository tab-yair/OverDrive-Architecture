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

    
    void testCommand(
        const std::string& input,
        const std::string& expectedCmd,
        const std::string& expectedArgString)
    {
        // set the input - add a newline to simulate Enter key press
        testInput.str(input + "\n");
        testInput.clear();

        std::vector<std::string> result = menu->nextCommand();

        ASSERT_EQ(result.size(), 2);
        EXPECT_EQ(result[0], expectedCmd);
        EXPECT_EQ(result[1], expectedArgString);
    }

};

// ============================================================
// INTEGRATION TESTS (Parse + consoleMenu) - using string command names and full-argument strings
// ============================================================

// Test that a basic "add" command with a single argument is parsed correctly
TEST_F(ConsoleMenuTest, ParsesAddCommand) {
    testCommand("add file.txt", "add", "file.txt");
}

// Test that a "add" command with a multiple arguments is parsed correctly
TEST_F(ConsoleMenuTest, ParsesAddCommandMultipleArgs) {
    testCommand("add file.txt some data to add", "add", "file.txt some data to add");
}

// Test that a "get" command with a filename is parsed correctly
TEST_F(ConsoleMenuTest, ParsesGetCommand) {
    testCommand("get file.txt", "get", "file.txt");
}

// Test that a "search" command with a single-word argument is parsed correctly
TEST_F(ConsoleMenuTest, ParsesSearchCommand) {
    testCommand("search pattern", "search", "pattern");
}

// Test that a "search" command with a multi-word argument is parsed correctly
TEST_F(ConsoleMenuTest, ParsesSearchCommandMultipleWords) {
    testCommand("search pattern blah blah-blah", "search", "pattern blah blah-blah");
}

// Test that multiple consecutive commands are parsed correctly when streamed in one input buffer
TEST_F(ConsoleMenuTest, MultipleCommandsInSequence) {
    testInput.str("add file1.txt\nget file2.txt\nsearch hello world\n");
    testInput.clear();

    // First command
    auto r1 = menu->nextCommand();
    EXPECT_EQ(r1[0], "add");
    EXPECT_EQ(r1[1], "file1.txt");

    // Second command
    auto r2 = menu->nextCommand();
    EXPECT_EQ(r2[0], "get");
    EXPECT_EQ(r2[1], "file2.txt");

    // Third command
    auto r3 = menu->nextCommand();
    EXPECT_EQ(r3[0], "search");
    EXPECT_EQ(r3[1], "hello world");
}

/*  

These are tests that the app will handle, so I commented them out to avoid confusion.

// Test that an invalid command silently does nothing and recieves new input command to handle
TEST_F(ConsoleMenuTest, InvalidCommandRecievesNewInput) {
    testCommand("invalid_command\nadd file.txt", "add", "file.txt");
}


// Test that extra whitespace before, between, and after words is handled correctly
TEST_F(ConsoleMenuTest, HandlesExtraWhitespace) {
    testCommand("   add     file.txt   \nget file2.txt",
                "get",
                "file2.txt");
}

// Test that commands are case-sensitive and waits to recieve new input command to handle
TEST_F(ConsoleMenuTest, CaseSensitiveCommands) {
    testCommand("ADD file.txt\nget file4.txt", "get", "file4.txt");
    testCommand("Get file.txt\nadd file2.txt", "add", "file2.txt");
    testCommand("SEARCH pattern", "search", "pattern");
}

// Test that multiple Invalid consecutive commands are parsed correctly when streamed in one input buffer
TEST_F(ConsoleMenuTest, MultipleInvalidCommandsInSequence) {
    testInput.str("Add file1.txt\n  get file2.txt\nsearch hello world\n");
    testInput.clear();

    // Only one command should be proccessed correctly due to case sensitivity and whitespace handling
    auto r3 = menu->nextCommand();
    EXPECT_EQ(r3[0], "search");
    EXPECT_EQ(r3[1], "hello world");
}

// Test that empty input results in silently doing nothing and recieving new input command to handle
TEST_F(ConsoleMenuTest, EmptyInputRecievesNewInput) {
    testCommand("\nsearch pattern", "search", "pattern");
}

*/


