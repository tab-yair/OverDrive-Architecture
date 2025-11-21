#include <gtest/gtest.h>
#include "CommandExecutor.h"
#include <map>
#include <string>
#include <vector>

// Mock command that returns a success message
class MockCommand : public ICommand {
public:
    std::optional<std::string> execute(const std::vector<std::string>& args) override {
        return "Command executed with " + std::to_string(args.size()) + " arguments";
    }
    
    ~MockCommand() override = default;
};

// Mock command that returns empty optional
class MockEmptyCommand : public ICommand {
public:
    std::optional<std::string> execute(const std::vector<std::string>& args) override {
        return std::nullopt;
    }
    
    ~MockEmptyCommand() override = default;
};

// Mock command that uses the arguments
class MockEchoCommand : public ICommand {
public:
    std::optional<std::string> execute(const std::vector<std::string>& args) override {
        if (args.empty()) {
            return "No arguments";
        }
        std::string result = "Echo: ";
        for (size_t i = 0; i < args.size(); ++i) {
            result += args[i];
            if (i < args.size() - 1) result += " ";
        }
        return result;
    }
    
    ~MockEchoCommand() override = default;
};

class CommandExecutorTest : public ::testing::Test {
protected:
    MockCommand* mockCmd;
    MockEmptyCommand* mockEmptyCmd;
    MockEchoCommand* mockEchoCmd;
    
    void SetUp() override {
        mockCmd = new MockCommand();
        mockEmptyCmd = new MockEmptyCommand();
        mockEchoCmd = new MockEchoCommand();
    }
    
    void TearDown() override {
        delete mockCmd;
        delete mockEmptyCmd;
        delete mockEchoCmd;
    }
};

// Test: Execute a valid command with arguments
TEST_F(CommandExecutorTest, ExecuteValidCommandWithArgs) {
    std::map<std::string, ICommand*> commands = {{"test", mockCmd}};
    CommandExecutor executor(commands);
    
    auto result = executor.execute("test", {"arg1", "arg2"});
    
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "Command executed with 2 arguments");
}

// Test: Execute a valid command with no arguments
TEST_F(CommandExecutorTest, ExecuteValidCommandNoArgs) {
    std::map<std::string, ICommand*> commands = {{"test", mockCmd}};
    CommandExecutor executor(commands);
    
    auto result = executor.execute("test", {});
    
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "Command executed with 0 arguments");
}

// Test: Execute command that returns empty optional
TEST_F(CommandExecutorTest, ExecuteCommandReturnsEmpty) {
    std::map<std::string, ICommand*> commands = {{"empty", mockEmptyCmd}};
    CommandExecutor executor(commands);
    
    auto result = executor.execute("empty", {});
    
    EXPECT_FALSE(result.has_value());
}

// Test: Execute command with actual argument processing
TEST_F(CommandExecutorTest, ExecuteEchoCommand) {
    std::map<std::string, ICommand*> commands = {{"echo", mockEchoCmd}};
    CommandExecutor executor(commands);
    
    auto result = executor.execute("echo", {"hello", "world"});
    
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "Echo: hello world");
}

// Test: Unknown command throws invalid_argument
TEST_F(CommandExecutorTest, UnknownCommandThrows) {
    std::map<std::string, ICommand*> commands = {{"test", mockCmd}};
    CommandExecutor executor(commands);
    
    EXPECT_THROW(
        executor.execute("nonexistent", {}),
        std::invalid_argument
    );
}

// Test: Unknown command throws with correct message
TEST_F(CommandExecutorTest, UnknownCommandThrowsWithMessage) {
    std::map<std::string, ICommand*> commands = {{"test", mockCmd}};
    CommandExecutor executor(commands);
    
    try {
        executor.execute("badcommand", {});
        FAIL() << "Expected std::invalid_argument";
    } catch (const std::invalid_argument& e) {
        EXPECT_STREQ(e.what(), "Unknown command: badcommand");
    }
}

// Test: Null command pointer throws runtime_error
TEST_F(CommandExecutorTest, NullCommandPointerThrows) {
    std::map<std::string, ICommand*> commands = {{"null", nullptr}};
    CommandExecutor executor(commands);
    
    EXPECT_THROW(
        executor.execute("null", {}),
        std::runtime_error
    );
}

// Test: Null command pointer throws with correct message
TEST_F(CommandExecutorTest, NullCommandPointerThrowsWithMessage) {
    std::map<std::string, ICommand*> commands = {{"null", nullptr}};
    CommandExecutor executor(commands);
    
    try {
        executor.execute("null", {});
        FAIL() << "Expected std::runtime_error";
    } catch (const std::runtime_error& e) {
        EXPECT_STREQ(e.what(), "Command 'null' is not initialized");
    }
}

// Test: Multiple commands in executor
TEST_F(CommandExecutorTest, MultipleCommands) {
    std::map<std::string, ICommand*> commands = {
        {"cmd1", mockCmd},
        {"echo", mockEchoCmd},
        {"empty", mockEmptyCmd}
    };
    CommandExecutor executor(commands);
    
    auto result1 = executor.execute("cmd1", {"test"});
    ASSERT_TRUE(result1.has_value());
    EXPECT_EQ(result1.value(), "Command executed with 1 arguments");
    
    auto result2 = executor.execute("echo", {"hi"});
    ASSERT_TRUE(result2.has_value());
    EXPECT_EQ(result2.value(), "Echo: hi");
    
    auto result3 = executor.execute("empty", {});
    EXPECT_FALSE(result3.has_value());
}

// Test: Empty command name
TEST_F(CommandExecutorTest, EmptyCommandName) {
    std::map<std::string, ICommand*> commands = {{"test", mockCmd}};
    CommandExecutor executor(commands);
    
    EXPECT_THROW(
        executor.execute("", {}),
        std::invalid_argument
    );
}

// Test: Empty executor (no commands)
TEST_F(CommandExecutorTest, EmptyExecutor) {
    std::map<std::string, ICommand*> commands = {};
    CommandExecutor executor(commands);
    
    EXPECT_THROW(
        executor.execute("anything", {}),
        std::invalid_argument
    );
}