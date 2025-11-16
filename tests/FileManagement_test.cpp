#include "gtest/gtest.h"
#include "LocalFileManagement.h"
#include "ICompressor.h"
#include "RLECompressor.h"
#include <memory>
#include <cstdlib>
#include <filesystem>
#include <algorithm>

namespace fs = std::filesystem;

// --------------------
// Dummy compressor for testing
// --------------------
class DummyCompressor : public ICompressor {
public:
    std::string compress(const std::string& input) override {
        return "COMPRESSED:" + input;
    }

    std::string decompress(const std::string& input) override {
        if (input.rfind("COMPRESSED:", 0) != 0) {
            throw std::runtime_error("Invalid compressed data");
        }
        return input.substr(11); // remove "COMPRESSED:"
    }
};

// --------------------
// Test fixture
// --------------------
class LocalFileManagementTest : public ::testing::Test {
protected:
    std::string testDir;
    std::unique_ptr<LocalFileManagement> fm;

    void SetUp() override {
        testDir = "/tmp/overdrive_test";
        std::filesystem::create_directories(testDir);

        if (setenv("OVERDRIVE_PATH", testDir.c_str(), 1) != 0) {
            throw std::runtime_error("Failed to set environment variable");
        }

        fm = std::make_unique<LocalFileManagement>(std::make_unique<DummyCompressor>());
    }

    void TearDown() override {
        std::filesystem::remove_all(testDir);
    }
};

// --------------------
// 1. Basic write/read tests
// --------------------

// Normal write/read
TEST_F(LocalFileManagementTest, WriteAndReadFile) {
    std::string fileName = "test.txt";
    std::string content = "Hello, world!";
    ASSERT_TRUE(fm->write(fileName, content));
    EXPECT_EQ(fm->read(fileName), content);
}

// Compressed write/read
TEST_F(LocalFileManagementTest, WriteCompressedAndReadDecompressed) {
    std::string fileName = "compressed.txt";
    std::string content = "Data123";
    ASSERT_TRUE(fm->writeCompressed(fileName, content));
    EXPECT_EQ(fm->readDecompressed(fileName), content);
}

// Writing with empty name should fail, empty content allowed
TEST_F(LocalFileManagementTest, WriteEmptyFileNameOrContent) {
    EXPECT_FALSE(fm->write("", "Data")); // empty name fails
    EXPECT_TRUE(fm->write("empty_content.txt", "")); // empty content allowed
    EXPECT_EQ(fm->read("empty_content.txt"), "");
}

// File names with special characters
TEST_F(LocalFileManagementTest, FileNameWithSpecialCharacters) {
    std::string fileName = "my file-123.txt";
    std::string content = "Some data";
    EXPECT_TRUE(fm->write(fileName, content));
    EXPECT_EQ(fm->read(fileName), content);
}

// --------------------
// 2. File existence & removal tests
// --------------------

// Remove existing file
TEST_F(LocalFileManagementTest, RemoveFile) {
    std::string fileName = "remove.txt";
    fm->write(fileName, "some data");
    EXPECT_TRUE(fm->exists(fileName));
    EXPECT_TRUE(fm->remove(fileName));
    EXPECT_FALSE(fm->exists(fileName));
}

// Remove non-existent file
TEST_F(LocalFileManagementTest, RemoveNonExistentFile) {
    EXPECT_FALSE(fm->remove("no_such_file.txt"));
}

// Exists on non-existent file
TEST_F(LocalFileManagementTest, ExistsOnNonExistentFile) {
    EXPECT_FALSE(fm->exists("missing.txt"));
}

// Read non-existent file returns empty string
TEST_F(LocalFileManagementTest, ReadNonExistentFile) {
    EXPECT_EQ(fm->read("missing.txt"), "");
}

// --------------------
// 3. File listing tests
// --------------------

// Empty directory
TEST_F(LocalFileManagementTest, FileListEmptyDirectory) {
    EXPECT_TRUE(fm->fileList().empty());
}

// Multiple files
TEST_F(LocalFileManagementTest, FileListMultipleFiles) {
    fm->write("file1.txt", "A");
    fm->write("file2.txt", "B");
    fm->write("file3.txt", "C");
    auto files = fm->fileList();
    EXPECT_EQ(files.size(), 3);
    EXPECT_NE(std::find(files.begin(), files.end(), "file1.txt"), files.end());
    EXPECT_NE(std::find(files.begin(), files.end(), "file2.txt"), files.end());
    EXPECT_NE(std::find(files.begin(), files.end(), "file3.txt"), files.end());
}

// Many files
TEST_F(LocalFileManagementTest, FileListManyFiles) {
    for (int i = 0; i < 50; ++i) {
        fm->write("file" + std::to_string(i) + ".txt", "data");
    }
    auto files = fm->fileList();
    EXPECT_EQ(files.size(), 50);
    for (int i = 0; i < 50; ++i) {
        EXPECT_NE(std::find(files.begin(), files.end(), "file" + std::to_string(i) + ".txt"), files.end());
    }
}

// --------------------
// 4. Content search tests
// --------------------

// Search in compressed files
TEST_F(LocalFileManagementTest, SearchContentInCompressedFiles) {
    fm->writeCompressed("file1.txt", "Hello");
    fm->writeCompressed("file2.txt", "World");
    fm->writeCompressed("file3.txt", "Hello World");
    auto results = fm->searchContent("Hello");
    EXPECT_EQ(results.size(), 2);
    EXPECT_NE(std::find(results.begin(), results.end(), "file1.txt"), results.end());
    EXPECT_NE(std::find(results.begin(), results.end(), "file3.txt"), results.end());
}

// Search content not found
TEST_F(LocalFileManagementTest, SearchContentNotFound) {
    fm->writeCompressed("file1.txt", "Hello");
    EXPECT_TRUE(fm->searchContent("XYZ").empty());
}

// --------------------
// 5. Error handling tests
// --------------------

// Read decompressed throws on invalid data
TEST_F(LocalFileManagementTest, ReadDecompressedThrowsOnInvalidData) {
    fm->write("bad.txt", "INVALID");
    EXPECT_THROW(fm->readDecompressed("bad.txt"), std::runtime_error);
}
