#include "gtest/gtest.h"
#include "commands/SearchCommand.h"
#include "mocks/MockFileManager.h"
#include <memory>
#include <string>
#include <vector>

class SearchCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::unique_ptr<SearchCommand> searchCommand;

    void SetUp() override {
        mockFileManager = std::make_shared<MockFileManager>();
        searchCommand = std::make_unique<SearchCommand>(mockFileManager);
    }

    void TearDown() override {
        // smart pointers handle cleanup
    }
};

// 1. Empty input args should return nullopt and not call fileManager
TEST_F(SearchCommandTest, EmptyInput_ReturnsNullOpt) {
    std::vector<std::string> args = {};  // no search text provided
    auto result = searchCommand->execute(args);

    EXPECT_FALSE(mockFileManager->searchContentCalled);
    EXPECT_FALSE(result.has_value());
}

// 2. Valid input but no matching files returns nullopt
TEST_F(SearchCommandTest, NoMatches_ReturnsNullOpt) {
    mockFileManager->searchContentReturnValue = {};  // no matching files
    std::vector<std::string> args = {"nothing"};

    auto result = searchCommand->execute(args);

    EXPECT_TRUE(mockFileManager->searchContentCalled);
    EXPECT_EQ(mockFileManager->lastSearchContent, "nothing");
    EXPECT_FALSE(result.has_value());
}

// 3. Valid input with multiple matching files returns space-separated filenames
TEST_F(SearchCommandTest, MultipleMatches_ReturnsSpaceSeparatedFilenames) {
    mockFileManager->searchContentReturnValue = {"file1.txt", "file2.txt", "another_file.txt"};
    std::vector<std::string> args = {"match"};

    auto result = searchCommand->execute(args);

    EXPECT_TRUE(mockFileManager->searchContentCalled);
    EXPECT_EQ(mockFileManager->lastSearchContent, "match");

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "file1.txt file2.txt another_file.txt");
}

// 4. Null fileManager pointer results in nullopt without exceptions
TEST(SearchCommandNullManagerTest, NullFileManager_ReturnsNullOpt) {
    SearchCommand cmd(nullptr);
    std::vector<std::string> args = {"something"};

    auto result = cmd.execute(args);

    EXPECT_FALSE(result.has_value());
}

// 5. Multi-word search term is correctly joined and passed to fileManager
TEST_F(SearchCommandTest, MultiWordSearchTerm_JoinedCorrectly) {
    mockFileManager->searchContentReturnValue = {"found.txt"};
    std::vector<std::string> args = {"hello", "world"};

    auto result = searchCommand->execute(args);

    EXPECT_TRUE(mockFileManager->searchContentCalled);
    EXPECT_EQ(mockFileManager->lastSearchContent, "hello world");

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result.value(), "found.txt");
}
