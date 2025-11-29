#include "gtest/gtest.h"
#include "file/LocalFileManagement.h"
#include "compressor/ICompressor.h"
#include "compressor/RLECompressor.h"
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
// 1. create() tests
// --------------------

// Basic create operation
TEST_F(LocalFileManagementTest, CreateNewFile) {
    std::string fileName = "newfile.txt";
    std::string content = "Hello, world!";
    ASSERT_NO_THROW(fm->create(fileName, content));
    EXPECT_TRUE(fm->exists(fileName));
    EXPECT_EQ(fm->read(fileName), content);
}

// Create empty file with default parameter
TEST_F(LocalFileManagementTest, CreateEmptyFile) {
    std::string fileName = "empty.txt";
    ASSERT_NO_THROW(fm->create(fileName));  // No content parameter
    EXPECT_TRUE(fm->exists(fileName));
    EXPECT_EQ(fm->read(fileName), "");
}

// Create empty file with explicit empty string
TEST_F(LocalFileManagementTest, CreateEmptyFileExplicit) {
    std::string fileName = "empty2.txt";
    ASSERT_NO_THROW(fm->create(fileName, ""));  // Explicit empty string
    EXPECT_TRUE(fm->exists(fileName));
    EXPECT_EQ(fm->read(fileName), "");
}

// Create duplicate file should fail
TEST_F(LocalFileManagementTest, CreateDuplicateFileFails) {
    std::string fileName = "duplicate.txt";
    fm->create(fileName, "first");
    EXPECT_THROW(fm->create(fileName, "second"), std::runtime_error);
    EXPECT_EQ(fm->read(fileName), "first"); // Original content unchanged
}

// Creating with empty name should fail
TEST_F(LocalFileManagementTest, CreateEmptyFileNameThrows) {
    EXPECT_THROW(fm->create("", "data"), std::invalid_argument);
}

// File names with special characters
TEST_F(LocalFileManagementTest, CreateFileWithSpecialCharacters) {
    std::string fileName = "my file-123.txt";
    std::string content = "Some data";
    ASSERT_NO_THROW(fm->create(fileName, content));
    EXPECT_EQ(fm->read(fileName), content);
}

// Create multiple files
TEST_F(LocalFileManagementTest, CreateMultipleFiles) {
    fm->create("file1.txt", "A");
    fm->create("file2.txt", "B");
    fm->create("file3.txt", "C");
    
    EXPECT_EQ(fm->fileList().size(), 3);
    EXPECT_EQ(fm->read("file1.txt"), "A");
    EXPECT_EQ(fm->read("file2.txt"), "B");
    EXPECT_EQ(fm->read("file3.txt"), "C");
}

// --------------------
// 2. write() tests - update existing files
// --------------------

// Write to existing file (overwrite)
TEST_F(LocalFileManagementTest, WriteToExistingFile) {
    std::string fileName = "update.txt";
    fm->create(fileName, "original");
    EXPECT_EQ(fm->read(fileName), "original");
    
    ASSERT_NO_THROW(fm->write(fileName, "updated"));
    EXPECT_EQ(fm->read(fileName), "updated");
}

// Write to non-existent file should fail
TEST_F(LocalFileManagementTest, WriteToNonExistentFileFails) {
    EXPECT_THROW(fm->write("missing.txt", "data"), std::runtime_error);
}

// Writing with empty name should fail
TEST_F(LocalFileManagementTest, WriteEmptyFileNameThrows) {
    EXPECT_THROW(fm->write("", "data"), std::invalid_argument);
}

// Write empty content to existing file
TEST_F(LocalFileManagementTest, WriteEmptyContent) {
    fm->create("clearme.txt", "some data");
    ASSERT_NO_THROW(fm->write("clearme.txt", "")); // Clear content
    EXPECT_EQ(fm->read("clearme.txt"), "");
}

// Write multiple times (overwrite repeatedly)
TEST_F(LocalFileManagementTest, WriteMultipleTimes) {
    std::string fileName = "versions.txt";
    fm->create(fileName, "v1");
    
    fm->write(fileName, "v2");
    EXPECT_EQ(fm->read(fileName), "v2");
    
    fm->write(fileName, "v3");
    EXPECT_EQ(fm->read(fileName), "v3");
}

// --------------------
// 3. read() tests
// --------------------

// Read non-existent file throws exception
TEST_F(LocalFileManagementTest, ReadNonExistentFile) {
    EXPECT_THROW(fm->read("missing.txt"), std::runtime_error);
}

// Read with empty filename throws
TEST_F(LocalFileManagementTest, ReadEmptyFileNameThrows) {
    EXPECT_THROW(fm->read(""), std::invalid_argument);
}

// --------------------
// 4. remove() tests
// --------------------

// Remove existing file
TEST_F(LocalFileManagementTest, RemoveFile) {
    std::string fileName = "remove.txt";
    fm->create(fileName, "some data");
    EXPECT_TRUE(fm->exists(fileName));
    ASSERT_NO_THROW(fm->remove(fileName));
    EXPECT_FALSE(fm->exists(fileName));
}

// Remove non-existent file (idempotent - doesn't throw)
TEST_F(LocalFileManagementTest, RemoveNonExistentFile) {
    EXPECT_NO_THROW(fm->remove("no_such_file.txt"));
}

// Remove with empty filename throws
TEST_F(LocalFileManagementTest, RemoveEmptyFileNameThrows) {
    EXPECT_THROW(fm->remove(""), std::invalid_argument);
}

// --------------------
// 5. exists() tests
// --------------------

// Exists on existing file
TEST_F(LocalFileManagementTest, ExistsOnExistingFile) {
    fm->create("exists.txt", "data");
    EXPECT_TRUE(fm->exists("exists.txt"));
}

// Exists on non-existent file
TEST_F(LocalFileManagementTest, ExistsOnNonExistentFile) {
    EXPECT_FALSE(fm->exists("missing.txt"));
}

// Exists with empty filename returns false
TEST_F(LocalFileManagementTest, ExistsEmptyFileName) {
    EXPECT_FALSE(fm->exists(""));
}

// --------------------
// 6. fileList() tests
// --------------------

// Empty directory
TEST_F(LocalFileManagementTest, FileListEmptyDirectory) {
    EXPECT_TRUE(fm->fileList().empty());
}

// Multiple files
TEST_F(LocalFileManagementTest, FileListMultipleFiles) {
    fm->create("file1.txt", "A");
    fm->create("file2.txt", "B");
    fm->create("file3.txt", "C");
    auto files = fm->fileList();
    EXPECT_EQ(files.size(), 3);
    EXPECT_NE(std::find(files.begin(), files.end(), "file1.txt"), files.end());
    EXPECT_NE(std::find(files.begin(), files.end(), "file2.txt"), files.end());
    EXPECT_NE(std::find(files.begin(), files.end(), "file3.txt"), files.end());
}

// Many files
TEST_F(LocalFileManagementTest, FileListManyFiles) {
    for (int i = 0; i < 50; ++i) {
        fm->create("file" + std::to_string(i) + ".txt", "data");
    }
    auto files = fm->fileList();
    EXPECT_EQ(files.size(), 50);
    for (int i = 0; i < 50; ++i) {
        EXPECT_NE(std::find(files.begin(), files.end(), "file" + std::to_string(i) + ".txt"), files.end());
    }
}

// --------------------
// 7. searchContent() tests
// --------------------

// Search for content in multiple files
TEST_F(LocalFileManagementTest, SearchContentInFiles) {
    fm->create("file1.txt", "Hello");
    fm->create("file2.txt", "World");
    fm->create("file3.txt", "Hello World");
    auto results = fm->searchContent("Hello");
    EXPECT_EQ(results.size(), 2);
    EXPECT_NE(std::find(results.begin(), results.end(), "file1.txt"), results.end());
    EXPECT_NE(std::find(results.begin(), results.end(), "file3.txt"), results.end());
}

// Search content not found
TEST_F(LocalFileManagementTest, SearchContentNotFound) {
    fm->create("file1.txt", "Hello");
    EXPECT_TRUE(fm->searchContent("XYZ").empty());
}

// Search in empty directory
TEST_F(LocalFileManagementTest, SearchContentEmptyDirectory) {
    EXPECT_TRUE(fm->searchContent("anything").empty());
}

// Search with empty string returns empty list
TEST_F(LocalFileManagementTest, SearchContentEmptyString) {
    fm->create("file1.txt", "Hello World");
    fm->create("file2.txt", "Goodbye");
    
    // Empty search string should return empty list, not all files
    EXPECT_TRUE(fm->searchContent("").empty());
}

// --------------------
// 8. Workflow / Integration tests
// --------------------

// Full file lifecycle: create → read → write → read → remove
TEST_F(LocalFileManagementTest, FileLifecycle) {
    std::string fileName = "lifecycle.txt";
    
    // Create
    fm->create(fileName, "initial");
    EXPECT_TRUE(fm->exists(fileName));
    
    // Read
    EXPECT_EQ(fm->read(fileName), "initial");
    
    // Update
    fm->write(fileName, "modified");
    EXPECT_EQ(fm->read(fileName), "modified");
    
    // Delete
    fm->remove(fileName);
    EXPECT_FALSE(fm->exists(fileName));
}

// Create then write workflow
TEST_F(LocalFileManagementTest, CreateThenWriteWorkflow) {
    std::string fileName = "workflow.txt";
    fm->create(fileName, "original");
    EXPECT_EQ(fm->read(fileName), "original");
    
    fm->write(fileName, "updated");
    EXPECT_EQ(fm->read(fileName), "updated");
    
    fm->write(fileName, "final");
    EXPECT_EQ(fm->read(fileName), "final");
}