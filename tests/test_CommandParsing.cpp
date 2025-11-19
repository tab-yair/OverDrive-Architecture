#include <gtest/gtest.h>
#include "CommandParsing.h"

// ============================================================
// TESTS FOR CommandParsing::parseLine
// ============================================================

class CommandParsingTest : public ::testing::Test {
protected:
    CommandParsing parser;
};

// Test: simple command with one argument
TEST_F(CommandParsingTest, SimpleCommandOneArg) {
    auto result = parser.parseLine("upload file.txt");

    ASSERT_EQ(result.size(), 2);
    EXPECT_EQ(result[0], "upload");
    EXPECT_EQ(result[1], "file.txt");
}

// Test: command with multiple arguments
TEST_F(CommandParsingTest, CommandMultipleArgs) {
    auto result = parser.parseLine("copy folderA folderB");

    ASSERT_EQ(result.size(), 3);
    EXPECT_EQ(result[0], "copy");
    EXPECT_EQ(result[1], "folderA");
    EXPECT_EQ(result[2], "folderB");
}

// Test: leading + trailing whitespace ignored
TEST_F(CommandParsingTest, LeadingTrailingSpacesIgnored) {
    auto result = parser.parseLine("   upload   file.txt   ");

    ASSERT_EQ(result.size(), 2);
    EXPECT_EQ(result[0], "upload");
    EXPECT_EQ(result[1], "file.txt");
}

// Test: multiple internal spaces collapse
TEST_F(CommandParsingTest, InternalExtraSpacesIgnored) {
    auto result = parser.parseLine("upload      file.txt");

    ASSERT_EQ(result.size(), 2);
    EXPECT_EQ(result[0], "upload");
    EXPECT_EQ(result[1], "file.txt");
}

// Test: empty or whitespace-only string → result empty
TEST_F(CommandParsingTest, EmptyInputReturnsEmptyVector) {
    auto result = parser.parseLine("   ");

    ASSERT_EQ(result.size(), 0);
}

// Test: command only, no arguments
TEST_F(CommandParsingTest, OnlyCommand) {
    auto result = parser.parseLine("list");

    ASSERT_EQ(result.size(), 1);
    EXPECT_EQ(result[0], "list");
}
