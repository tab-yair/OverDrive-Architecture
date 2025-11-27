#include <gtest/gtest.h>
#include "executors/CommandExecutor.h"
#include <memory>
#include <map>
#include <string>
#include <vector>

// Mock command that returns a success message
class MockCommand : public ICommand {
public:
    CommandResult execute(const std::vector<std::string>& args) override {
        return CommandResult(CommandResult::Status::OK, 
                           "Command executed with " + std::to_string(args.size()) + " arguments");
    }
    
    ~MockCommand() override = default;
};

// Mock command that returns no content
class MockEmptyCommand : public ICommand {
public:
    CommandResult execute(const std::vector<std::string>& args) override {
        return CommandResult(CommandResult::Status::NO_CONTENT);
    }
    
    ~MockEmptyCommand() override = default;
};

// Mock command that uses the arguments
class MockEchoCommand : public ICommand {
public:
    CommandResult execute(const std::vector<std::string>& args) override {
        if (args.empty()) {
            return CommandResult(CommandResult::Status::OK, "No arguments");
        }
        std::string result = "Echo: ";
        for (size_t i = 0; i < args.size(); ++i) {
            result += args[i];
            if (i < args.size() - 1) result += " ";
        }
        return CommandResult(CommandResult::Status::OK, result);
    }
    
    ~MockEchoCommand() override = default;
};

// Test: Execute a valid command with arguments
TEST(CommandExecutorTest, ExecuteValidCommandWithArgs) {
    // Create commands map with unique_ptr ownership
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["TEST"] = std::make_unique<MockCommand>();
    
    // Transfer ownership to executor
    CommandExecutor executor(std::move(commands));
    
    auto result = executor.execute("test", {"arg1", "arg2"});
    
    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "Command executed with 2 arguments");
}

// Test: Execute a valid command with no arguments
TEST(CommandExecutorTest, ExecuteValidCommandNoArgs) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["TEST"] = std::make_unique<MockCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    auto result = executor.execute("test", {});
    
    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "Command executed with 0 arguments");
}

// Test: Execute command that returns no content
TEST(CommandExecutorTest, ExecuteCommandReturnsEmpty) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["EMPTY"] = std::make_unique<MockEmptyCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    auto result = executor.execute("empty", {});
    
    EXPECT_EQ(result.status, CommandResult::Status::NO_CONTENT);
    EXPECT_TRUE(result.content.empty());
}

// Test: Execute command with actual argument processing
TEST(CommandExecutorTest, ExecuteEchoCommand) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["ECHO"] = std::make_unique<MockEchoCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    auto result = executor.execute("echo", {"hello", "world"});
    
    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "Echo: hello world");
}

// Test: Unknown command throws invalid_argument
TEST(CommandExecutorTest, UnknownCommandThrows) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["TEST"] = std::make_unique<MockCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    EXPECT_THROW(
        executor.execute("nonexistent", {}),
        std::invalid_argument
    );
}

// Test: Unknown command throws with correct message
TEST(CommandExecutorTest, UnknownCommandThrowsWithMessage) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["TEST"] = std::make_unique<MockCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    try {
        executor.execute("badcommand", {});
        FAIL() << "Expected std::invalid_argument";
    } catch (const std::invalid_argument& e) {
        EXPECT_STREQ(e.what(), "Unknown command: badcommand");
    }
}

// Test: Null command pointer throws runtime_error
TEST(CommandExecutorTest, NullCommandPointerThrows) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["NULL"] = nullptr;
    
    CommandExecutor executor(std::move(commands));
    
    EXPECT_THROW(
        executor.execute("null", {}),
        std::runtime_error
    );
}

// Test: Null command pointer throws with correct message
TEST(CommandExecutorTest, NullCommandPointerThrowsWithMessage) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["NULL"] = nullptr;
    
    CommandExecutor executor(std::move(commands));
    
    try {
        executor.execute("null", {});
        FAIL() << "Expected std::runtime_error";
    } catch (const std::runtime_error& e) {
        EXPECT_STREQ(e.what(), "Command 'null' is not initialized");
    }
}

// Test: Multiple commands in executor
TEST(CommandExecutorTest, MultipleCommands) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["CMD1"] = std::make_unique<MockCommand>();
    commands["ECHO"] = std::make_unique<MockEchoCommand>();
    commands["EMPTY"] = std::make_unique<MockEmptyCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    auto result1 = executor.execute("cmd1", {"test"});
    EXPECT_EQ(result1.status, CommandResult::Status::OK);
    EXPECT_EQ(result1.content, "Command executed with 1 arguments");
    
    auto result2 = executor.execute("echo", {"hi"});
    EXPECT_EQ(result2.status, CommandResult::Status::OK);
    EXPECT_EQ(result2.content, "Echo: hi");
    
    auto result3 = executor.execute("empty", {});
    EXPECT_EQ(result3.status, CommandResult::Status::NO_CONTENT);
}

// Test: Empty command name
TEST(CommandExecutorTest, EmptyCommandName) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["TEST"] = std::make_unique<MockCommand>();
    
    CommandExecutor executor(std::move(commands));
    
    EXPECT_THROW(
        executor.execute("", {}),
        std::invalid_argument
    );
}

// Test: Empty executor (no commands)
TEST(CommandExecutorTest, EmptyExecutor) {
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    
    CommandExecutor executor(std::move(commands));
    
    EXPECT_THROW(
        executor.execute("anything", {}),
        std::invalid_argument
    );
}