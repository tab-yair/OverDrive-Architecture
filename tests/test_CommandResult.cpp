#include <gtest/gtest.h>
#include "CommandResult.h"

TEST(CommandResultTest, IsErrorDefaultsFalse) {
    CommandResult r{"hello"};
    EXPECT_FALSE(r.isError);
}

TEST(CommandResultTest, FieldsAssignedCorrectly) {
    CommandResult r{"failed", true};
    EXPECT_EQ(r.message, "failed");
    EXPECT_TRUE(r.isError);
}
