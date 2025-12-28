#include <gtest/gtest.h>
#include <filesystem>
#include <fstream>
#include <algorithm>
#include "file/management/LocalFileManagement.h"
#include "file/storage/IFileStorage.h"

namespace fs = std::filesystem;

// ========================
// Simple fake storage implementation
// This is enough to test LocalFileManagement without touching real storage
// ========================
class SimpleFileStorage : public IFileStorage {
public:
    // Write content to file
    void writeFile(const fs::path& p, const std::string &content = "") override {
        std::ofstream ofs(p);
        ofs << content;
    }

    // Read content from file
    std::string readFile(const fs::path& p) override {
        std::ifstream ifs(p);
        if (!ifs) throw std::runtime_error("File missing");
        return std::string((std::istreambuf_iterator<char>(ifs)),
                           std::istreambuf_iterator<char>());
    }

    // Delete file
    void deleteFile(const fs::path& p) override {
        fs::remove(p);
    }
};

// ========================
// Test Fixture
// Creates a temporary directory and a LocalFileManagement instance for each test
// ========================
class LocalFileManagementTest : public ::testing::Test {
protected:
    fs::path tempDir; // temporary folder for tests
    std::unique_ptr<LocalFileManagement> lf; // the class under test

    void SetUp() override {
        // Create a temporary directory for files
        tempDir = fs::temp_directory_path() / "lfm_test_dir";
        fs::create_directory(tempDir);

        // Use the simple storage and point LocalFileManagement to tempDir
        auto storage = std::make_unique<SimpleFileStorage>();
        lf = std::make_unique<LocalFileManagement>(std::move(storage), tempDir);
    }

    void TearDown() override {
        // Remove the temporary directory after the test
        fs::remove_all(tempDir);
    }
};

// ========================
// Tests
// ========================

// Test creating a file and reading its content
TEST_F(LocalFileManagementTest, CreateAndRead) {
    lf->create("file1.txt", "Hello World"); // create file
    std::string content = lf->read("file1.txt"); // read content
    EXPECT_EQ(content, "Hello World"); // check content matches
}

// Test creating a duplicate file throws
TEST_F(LocalFileManagementTest, CreateDuplicateThrows) {
    lf->create("file2.txt", "First"); 
    EXPECT_THROW(lf->create("file2.txt", "Second"), std::runtime_error); // duplicate
}

// Test writing to an existing file updates content
TEST_F(LocalFileManagementTest, WriteUpdatesContent) {
    lf->create("file3.txt", "Initial");
    lf->write("file3.txt", "Updated");
    EXPECT_EQ(lf->read("file3.txt"), "Updated");
}

// Writing to a non-existent file should throw
TEST_F(LocalFileManagementTest, WriteNonExistentThrows) {
    EXPECT_THROW(lf->write("nonexistent.txt", "data"), std::runtime_error);
}

// Removing an existing file should succeed
TEST_F(LocalFileManagementTest, RemoveExistingFile) {
    lf->create("file4.txt", "content");
    lf->remove("file4.txt");
    EXPECT_FALSE(lf->exists("file4.txt")); // file no longer exists
}

// Removing a non-existent file should throw
TEST_F(LocalFileManagementTest, RemoveNonExistentThrows) {
    EXPECT_THROW(lf->remove("missing.txt"), std::runtime_error);
}

// List all files in the directory
TEST_F(LocalFileManagementTest, ListFiles) {
    lf->create("f1.txt");
    lf->create("f2.txt");
    lf->create("other.txt");

    auto files = lf->list();
    EXPECT_EQ(files.size(), 3); // three files
    EXPECT_TRUE(std::find(files.begin(), files.end(), "f1.txt") != files.end());
    EXPECT_TRUE(std::find(files.begin(), files.end(), "f2.txt") != files.end());
    EXPECT_TRUE(std::find(files.begin(), files.end(), "other.txt") != files.end());
}

// Search in both file name and content
TEST_F(LocalFileManagementTest, SearchContentOnly) {
    lf->create("findme.txt", "hello world"); 
    lf->create("file2.txt", "findme");      

    auto results = lf->search("findme");
    EXPECT_EQ(results.size(), 2);            
    // Both files should match: findme.txt (by name) and file2.txt (by content)
}

// Searching for non-existent content still returns empty
TEST_F(LocalFileManagementTest, SearchContentEmpty) {
    lf->create("file1.txt", "abc");
    auto results = lf->search("xyz");
    EXPECT_TRUE(results.empty());
}

// validateFileName blocks only empty names
TEST_F(LocalFileManagementTest, ValidateFileNameRejectsInvalid) {
    EXPECT_THROW(lf->create("", "data"), std::invalid_argument);      // empty name
}

