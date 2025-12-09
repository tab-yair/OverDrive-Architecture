#include "gtest/gtest.h"
#include "commands/SearchCommand.h"
#include "mocks/MockFileManager.h"
#include "handlers/ClientContext.h"
#include <memory>
#include <vector>
#include <string>

/**
 * Test environment for SearchCommand
 */
class SearchCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<SearchCommand> searchCommand;
    std::shared_ptr<ClientContext> testContext;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        testContext = std::make_shared<ClientContext>(ClientContext{"1",10});
        searchCommand = std::make_unique<SearchCommand>(mockFileManager, testContext);
    }
};

// no arguments test case
TEST_F(SearchCommandTest, NoArguments_ReturnsBadRequest) {
    std::vector<std::string> args = {};
    auto result = searchCommand->execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
    EXPECT_FALSE(mockFileManager->searchCalled);
}

// null file manager test case
TEST_F(SearchCommandTest, NullFileManager_ReturnsBadRequest) {
    SearchCommand cmd(nullptr, testContext);
    std::vector<std::string> args = {"term"};

    auto result = cmd.execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::BAD_REQUEST);
}

// empty search term test case
TEST_F(SearchCommandTest, NoMatchingFiles_ReturnsOK_EmptyOutput) {
    mockFileManager->searchReturnValue = {};

    std::vector<std::string> args = {"hello"};
    auto result = searchCommand->execute(args);

    EXPECT_TRUE(mockFileManager->searchCalled);
    EXPECT_EQ(mockFileManager->lastClientId, "1");
    EXPECT_EQ(mockFileManager->lastSearch, "hello");

    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "");
}

// multiple arguments test case
TEST_F(SearchCommandTest, MultipleArguments_ConcatenatedCorrectly) {
    mockFileManager->searchReturnValue = {};

    std::vector<std::string> args = {"hello", "world"};
    auto result = searchCommand->execute(args);

    EXPECT_EQ(mockFileManager->lastSearch, "hello world");
}

// matching files test case
TEST_F(SearchCommandTest, MatchingFiles_ReturnsJoinedFilenames) {
    mockFileManager->searchReturnValue = {"a.txt", "b.txt", "c.txt"};

    std::vector<std::string> args = {"abc"};
    auto result = searchCommand->execute(args);

    EXPECT_TRUE(mockFileManager->searchCalled);
    EXPECT_EQ(result.status, CommandResult::Status::OK);
    EXPECT_EQ(result.content, "a.txt b.txt c.txt");
}

// search throws exception test case
TEST_F(SearchCommandTest, SearchThrows_ReturnsNotFound) {
    mockFileManager->throwOnSearch = true; // You should add this boolean
    
    std::vector<std::string> args = {"error"};
    auto result = searchCommand->execute(args);

    EXPECT_EQ(result.status, CommandResult::Status::NOT_FOUND);
}

// verify client ID passed correctly
TEST_F(SearchCommandTest, PassesCorrectClientId) {
    mockFileManager->searchReturnValue = {};

    std::vector<std::string> args = {"test"};
    searchCommand->execute(args);

    EXPECT_EQ(mockFileManager->lastClientId, "1");
}
