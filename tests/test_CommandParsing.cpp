#include <gtest/gtest.h>
#include "CommandParser.h"
#include "ParsedCommand.h"

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

TEST_F(ParserTest, SingleWordCommand) {
    testParse("list", "list", {});
}

TEST_F(ParserTest, CommandWithOneArgument) {
    testParse("upload file.txt", "upload", {"file.txt"});
}

TEST_F(ParserTest, CommandWithMultipleArguments) {
    testParse("download file1.txt file2.txt file3.txt", 
              "download", 
              {"file1.txt", "file2.txt", "file3.txt"});
}

TEST_F(ParserTest, CommandWithManyArguments) {
    testParse("command arg1 arg2 arg3 arg4 arg5", 
              "command", 
              {"arg1", "arg2", "arg3", "arg4", "arg5"});
}

// ========== Whitespace Handling Tests ==========

TEST_F(ParserTest, LeadingWhitespace) {
    testParse("   upload file.txt", "upload", {"file.txt"});
}

TEST_F(ParserTest, TrailingWhitespace) {
    testParse("upload file.txt   ", "upload", {"file.txt"});
}

TEST_F(ParserTest, LeadingAndTrailingWhitespace) {
    testParse("   upload file.txt   ", "upload", {"file.txt"});
}

TEST_F(ParserTest, MultipleSpacesBetweenWords) {
    testParse("upload    file.txt", "upload", {"file.txt"});
}

TEST_F(ParserTest, MultipleSpacesBetweenAllWords) {
    testParse("download   file1.txt    file2.txt     file3.txt", 
              "download", 
              {"file1.txt", "file2.txt", "file3.txt"});
}

TEST_F(ParserTest, ExcessiveWhitespaceEverywhere) {
    testParse("    command     arg1      arg2     ", 
              "command", 
              {"arg1", "arg2"});
}

TEST_F(ParserTest, TabCharacters) {
    testParse("upload\tfile.txt", "upload", {"file.txt"});
}

TEST_F(ParserTest, MixedWhitespace) {
    testParse("  upload \t  file.txt  \t arg2  ", 
              "upload", 
              {"file.txt", "arg2"});
}

// ========== Edge Cases ==========

TEST_F(ParserTest, EmptyString) {
    testParse("", "", {});
}

TEST_F(ParserTest, OnlySpaces) {
    testParse("     ", "", {});
}

TEST_F(ParserTest, OnlyTabs) {
    testParse("\t\t\t", "", {});
}

TEST_F(ParserTest, OnlyWhitespace) {
    testParse("  \t  \t  ", "", {});
}

// ========== Special Characters in Arguments ==========

TEST_F(ParserTest, PathArgument) {
    testParse("upload /home/user/documents/file.txt", 
              "upload", 
              {"/home/user/documents/file.txt"});
}

TEST_F(ParserTest, ArgumentsWithSpecialCharacters) {
    testParse("download file-name_v2.0.txt", 
              "download", 
              {"file-name_v2.0.txt"});
}

TEST_F(ParserTest, ArgumentsWithDots) {
    testParse("upload my.file.name.txt", 
              "upload", 
              {"my.file.name.txt"});
}

TEST_F(ParserTest, ArgumentsWithHyphens) {
    testParse("command --flag --option value", 
              "command", 
              {"--flag", "--option", "value"});
}

TEST_F(ParserTest, URLAsArgument) {
    testParse("fetch https://example.com/file.txt", 
              "fetch", 
              {"https://example.com/file.txt"});
}

// ========== Length Tests ==========

TEST_F(ParserTest, VeryLongCommand) {
    std::string longCommand(1000, 'a');
    testParse(longCommand, longCommand, {});
}

TEST_F(ParserTest, VeryLongArgument) {
    std::string longArg(1000, 'x');
    testParse("upload " + longArg, "upload", {longArg});
}

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

TEST_F(ParserTest, UploadCommand) {
    testParse("upload documents/report.pdf", 
              "upload", 
              {"documents/report.pdf"});
}

TEST_F(ParserTest, DownloadCommand) {
    testParse("download file123.txt", 
              "download", 
              {"file123.txt"});
}

TEST_F(ParserTest, ListCommand) {
    testParse("list", "list", {});
}

TEST_F(ParserTest, DeleteCommand) {
    testParse("delete file1.txt file2.txt", 
              "delete", 
              {"file1.txt", "file2.txt"});
}

TEST_F(ParserTest, ExitCommand) {
    testParse("exit", "exit", {});
}

TEST_F(ParserTest, HelpCommand) {
    testParse("help upload", "help", {"upload"});
}