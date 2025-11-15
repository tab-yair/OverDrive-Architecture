#include <gtest/gtest.h>
#include "StringUtils.h"

// ============================================================
// TESTS FOR StringUtils::parseCommand
// ============================================================

// Test parsing a normal command with one argument
// Ensures the function splits at the first space correctly.
TEST(ParseCommandTest, BasicCommandWithArgument) {
    auto result = StringUtils::parseCommand("run game");
    EXPECT_EQ(result[0], "run");
    EXPECT_EQ(result[1], "game");
}

// Test parsing a command with multiple words in the arguments
// Ensures everything after the first space is treated as arguments, unchanged.
TEST(ParseCommandTest, CommandWithMultipleArguments) {
    auto result = StringUtils::parseCommand("copy file A to B");
    EXPECT_EQ(result[0], "copy");
    EXPECT_EQ(result[1], "file A to B");
}

// Test command without arguments
// Ensures arguments part is empty when no space exists.
TEST(ParseCommandTest, CommandWithoutArguments) {
    auto result = StringUtils::parseCommand("exit");
    EXPECT_EQ(result[0], "exit");
    EXPECT_EQ(result[1], "");
}

// Test empty input string
// According to the rules, empty input returns empty command and empty arguments.
TEST(ParseCommandTest, EmptyInputReturnsEmptyCommand) {
    auto result = StringUtils::parseCommand("");
    EXPECT_EQ(result[0], "");
    EXPECT_EQ(result[1], "");
}

// Test input beginning with a space
// Function should detect invalid leading space and return empty command + args.
TEST(ParseCommandTest, LeadingSpaceReturnsEmptyCommand) {
    auto result = StringUtils::parseCommand("  start");
    EXPECT_EQ(result[0], "");
    EXPECT_EQ(result[1], "");
}

// Test input with a single space but no command before it
// Ensures same behavior: empty command/arguments.
TEST(ParseCommandTest, SingleSpaceInputReturnsEmptyCommand) {
    auto result = StringUtils::parseCommand(" ");
    EXPECT_EQ(result[0], "");
    EXPECT_EQ(result[1], "");
}

// Test input where command is valid but arguments begin with spaces
// Function should not trim the argument; behavior is intentionally raw.
TEST(ParseCommandTest, ArgumentsMayStartWithSpaces) {
    auto result = StringUtils::parseCommand("run    test");
    EXPECT_EQ(result[0], "run");
    EXPECT_EQ(result[1], "   test"); // three spaces preserved
}

// Test that the function correctly handles tabs NOT being treated as spaces
// Because the code only splits on actual space (' '), not '\t'.
TEST(ParseCommandTest, CommandWithTabDoesNotSplit) {
    auto result = StringUtils::parseCommand("run\ttest");
    EXPECT_EQ(result[0], "run\ttest"); // whole string is the command
    EXPECT_EQ(result[1], "");
}
