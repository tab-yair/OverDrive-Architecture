#include <gtest/gtest.h>
#include <filesystem>
#include <string>
#include "file/storage/LocalFileStorage.h"

using namespace std;
namespace fs = std::filesystem;

// Test fixture for LocalFileStorage
class LocalFileStorageTest : public ::testing::Test {
protected:
    fs::path tempDir;
    fs::path validFile;
    fs::path invalidFile;
    string content;
    unique_ptr<LocalFileStorage> storage;

    void SetUp() override {
        tempDir = fs::temp_directory_path() / "file_test_tmp";
        fs::create_directories(tempDir);

        validFile = tempDir / "valid_file.bin";
        invalidFile = fs::path("/invalid_path/illegal_file.bin");
        content = "Hello, world!";
        
        storage = make_unique<LocalFileStorage>();
    }

    void TearDown() override {
        fs::remove_all(tempDir);
    }
};

// writeFile test
TEST_F(LocalFileStorageTest, WriteFile) {
    EXPECT_NO_THROW(storage->writeFile(validFile, content));
    EXPECT_TRUE(fs::exists(validFile));

    EXPECT_THROW(storage->writeFile(invalidFile, content), std::runtime_error);
}

// readFile test
TEST_F(LocalFileStorageTest, ReadFile) {
    storage->writeFile(validFile, content);

    string readContent;
    EXPECT_NO_THROW(readContent = storage->readFile(validFile));
    EXPECT_EQ(readContent, content);

    EXPECT_THROW(storage->readFile(invalidFile), std::runtime_error);
}

// deleteFile test
TEST_F(LocalFileStorageTest, DeleteFile) {
    storage->writeFile(validFile, content);

    EXPECT_NO_THROW(storage->deleteFile(validFile));
    EXPECT_FALSE(fs::exists(validFile));

    EXPECT_THROW(storage->deleteFile(invalidFile), std::runtime_error);
}
