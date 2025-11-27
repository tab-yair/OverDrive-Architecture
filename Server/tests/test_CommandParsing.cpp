#include <gtest/gtest.h>
#include "parsers/CommandParser.h"
#include "protocol/ParsedCommand.h"

class ParserTest : public ::testing::Test {
protected:
    CommandParser* parser;
    
    void SetUp() override {
        parser = new CommandParser();
    }
    
    void TearDown() override {
        delete parser;
    }
    
    // Helper to test parsing
    void testParse(
        const std::string& input,
        const std::string& expectedName,
        const std::vector<std::string>& expectedArgs)
    {
        ParsedCommand result = parser->parse(input);
        
        EXPECT_EQ(result.name, expectedName);
        EXPECT_EQ(result.args, expectedArgs);
    }
};

// ============================================================
// UNIT TESTS - testing commandParser parse() method
// ============================================================
// ========== Basic Parsing Tests ==========

// Verifies parsing a command with no arguments
TEST_F(ParserTest, SingleWordCommand) {
    testParse("list", "list", {});
}

// Verifies parsing a command with a single argument
TEST_F(ParserTest, CommandWithOneArgument) {
    testParse("upload file.txt", "upload", {"file.txt"});
}

// Verifies parsing a command with three arguments
TEST_F(ParserTest, CommandWithMultipleArguments) {
    testParse("download file1.txt file2.txt file3.txt", 
              "download", 
              {"file1.txt", "file2.txt", "file3.txt"});
}

// Verifies parsing a command with five arguments
TEST_F(ParserTest, CommandWithManyArguments) {
    testParse("command arg1 arg2 arg3 arg4 arg5", 
              "command", 
              {"arg1", "arg2", "arg3", "arg4", "arg5"});
}

// ========== Whitespace Handling Tests ==========

// Verifies parser correctly handles leading spaces before command
TEST_F(ParserTest, LeadingWhitespace) {
    testParse("   upload file.txt", "upload", {"file.txt"});
}

// Verifies parser correctly handles trailing spaces after arguments
TEST_F(ParserTest, TrailingWhitespace) {
    testParse("upload file.txt   ", "upload", {"file.txt"});
}

// Verifies parser correctly handles both leading and trailing whitespace
TEST_F(ParserTest, LeadingAndTrailingWhitespace) {
    testParse("   upload file.txt   ", "upload", {"file.txt"});
}

// Verifies parser handles multiple consecutive spaces between command and argument
TEST_F(ParserTest, MultipleSpacesBetweenWords) {
    testParse("upload    file.txt", "upload", {"file.txt"});
}

// Verifies parser handles multiple consecutive spaces between all tokens
TEST_F(ParserTest, MultipleSpacesBetweenAllWords) {
    testParse("download   file1.txt    file2.txt     file3.txt", 
              "download", 
              {"file1.txt", "file2.txt", "file3.txt"});
}

// Verifies parser handles excessive whitespace in all positions
TEST_F(ParserTest, ExcessiveWhitespaceEverywhere) {
    testParse("    command     arg1      arg2     ", 
              "command", 
              {"arg1", "arg2"});
}

// Verifies parser correctly handles tab characters as delimiters
TEST_F(ParserTest, TabCharacters) {
    testParse("upload\tfile.txt", "upload", {"file.txt"});
}

// Verifies parser handles mixed spaces and tabs
TEST_F(ParserTest, MixedWhitespace) {
    testParse("  upload \t  file.txt  \t arg2  ", 
              "upload", 
              {"file.txt", "arg2"});
}

// ========== Edge Cases ==========

// Verifies parser handles empty input string
TEST_F(ParserTest, EmptyString) {
    testParse("", "", {});
}

// Verifies parser handles input containing only spaces
TEST_F(ParserTest, OnlySpaces) {
    testParse("     ", "", {});
}

// Verifies parser handles input containing only tab characters
TEST_F(ParserTest, OnlyTabs) {
    testParse("\t\t\t", "", {});
}

// Verifies parser handles input containing mixed whitespace characters only
TEST_F(ParserTest, OnlyWhitespace) {
    testParse("  \t  \t  ", "", {});
}

// ========== Special Characters in Arguments ==========

// Verifies parser handles file path arguments with forward slashes
TEST_F(ParserTest, PathArgument) {
    testParse("upload /home/user/documents/file.txt", 
              "upload", 
              {"/home/user/documents/file.txt"});
}

// Verifies parser handles arguments containing hyphens, underscores, and dots
TEST_F(ParserTest, ArgumentsWithSpecialCharacters) {
    testParse("download file-name_v2.0.txt", 
              "download", 
              {"file-name_v2.0.txt"});
}

// Verifies parser handles arguments with multiple dots in filename
TEST_F(ParserTest, ArgumentsWithDots) {
    testParse("upload my.file.name.txt", 
              "upload", 
              {"my.file.name.txt"});
}

// Verifies parser handles command-line style flags with double hyphens
TEST_F(ParserTest, ArgumentsWithHyphens) {
    testParse("command --flag --option value", 
              "command", 
              {"--flag", "--option", "value"});
}

// Verifies parser handles URL strings as arguments
TEST_F(ParserTest, URLAsArgument) {
    testParse("fetch https://example.com/file.txt", 
              "fetch", 
              {"https://example.com/file.txt"});
}

// ========== Length Tests ==========

// Verifies parser handles extremely long command names (1000 characters)
TEST_F(ParserTest, VeryLongCommand) {
    std::string longCommand(1000, 'a');
    testParse(longCommand, longCommand, {});
}

// Verifies parser handles extremely long argument strings (1000 characters)
TEST_F(ParserTest, VeryLongArgument) {
    std::string longArg(1000, 'x');
    testParse("upload " + longArg, "upload", {longArg});
}

// Verifies parser handles large number of arguments (100 arguments)
TEST_F(ParserTest, ManyArguments) {
    std::vector<std::string> manyArgs;
    std::string input = "command";
    for (int i = 0; i < 100; i++) {
        std::string arg = "arg" + std::to_string(i);
        input += " " + arg;
        manyArgs.push_back(arg);
    }
    testParse(input, "command", manyArgs);
}

// ========== Real-World Command Examples ==========

// Verifies parser correctly handles typical upload command with file path
TEST_F(ParserTest, UploadCommand) {
    testParse("upload documents/report.pdf", 
              "upload", 
              {"documents/report.pdf"});
}

// Verifies parser correctly handles typical download command with filename
TEST_F(ParserTest, DownloadCommand) {
    testParse("download file123.txt", 
              "download", 
              {"file123.txt"});
}

// Verifies parser correctly handles list command with no arguments
TEST_F(ParserTest, ListCommand) {
    testParse("list", "list", {});
}

// Verifies parser correctly handles delete command with multiple file arguments
TEST_F(ParserTest, DeleteCommand) {
    testParse("delete file1.txt file2.txt", 
              "delete", 
              {"file1.txt", "file2.txt"});
}

// Verifies parser correctly handles exit command with no arguments
TEST_F(ParserTest, ExitCommand) {
    testParse("exit", "exit", {});
}

// Verifies parser correctly handles help command with topic argument
TEST_F(ParserTest, HelpCommand) {
    testParse("help upload", "help", {"upload"});
}