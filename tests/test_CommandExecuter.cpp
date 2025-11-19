#include <gtest/gtest.h>
#include "CommandExecuter.h"

// ============================================================
// TESTS FOR CommandExecuter::execute
// ============================================================

// Test parsing a normal command with one argument
// Ensures the function splits at the first space correctly.
TEST(ParseCommandTest, BasicCommandWithArgument) {
    auto result = CommandExecuter::execute("run game");
    EXPECT_EQ(result[0], "run");
    EXPECT_EQ(result[1], "game");
}


