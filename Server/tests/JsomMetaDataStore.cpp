#include "gtest/gtest.h"
#include "file/metadata/JsonMetadataStore.h"
#include <filesystem>
#include <optional>

class JsonMetadataStoreTest : public ::testing::Test {
protected:
    std::filesystem::path tmpFile;

    void SetUp() override {
        tmpFile = std::filesystem::temp_directory_path() / "metadata_test.json";
        // מנקה קובץ אם קיים
        if (std::filesystem::exists(tmpFile)) {
            std::filesystem::remove(tmpFile);
        }
    }

    void TearDown() override {
        if (std::filesystem::exists(tmpFile)) {
            std::filesystem::remove(tmpFile);
        }
    }

    FileMetaData makeTestMetadata(const std::string& name) {
        return FileMetaData{
            "owner1",
            name,
            "/tmp/" + name,
            123,
            "2025-12-02T12:00:00Z",
            "2025-12-02T12:00:00Z"
        };
    }
};

// Test 1: Save and load
TEST_F(JsonMetadataStoreTest, SaveAndLoad) {
    JsonMetadataStore store(tmpFile);

    auto meta = makeTestMetadata("file1.txt");
    store.save("file1", meta);

    auto loaded = store.load("file1");
    ASSERT_TRUE(loaded.has_value());
    EXPECT_EQ(loaded->logicalName, "file1.txt");
    EXPECT_EQ(loaded->fileSize, 123);
}

// Test 2: Exists
TEST_F(JsonMetadataStoreTest, Exists) {
    JsonMetadataStore store(tmpFile);

    EXPECT_FALSE(store.exists("file1"));

    store.save("file1", makeTestMetadata("file1.txt"));
    EXPECT_TRUE(store.exists("file1"));
}

// Test 3: Remove
TEST_F(JsonMetadataStoreTest, Remove) {
    JsonMetadataStore store(tmpFile);

    store.save("file1", makeTestMetadata("file1.txt"));
    EXPECT_TRUE(store.exists("file1"));

    store.remove("file1");
    EXPECT_FALSE(store.exists("file1"));

    // Removing non-existing key should not throw
    EXPECT_NO_THROW(store.remove("file2"));
}

// Test 4: List
TEST_F(JsonMetadataStoreTest, List) {
    JsonMetadataStore store(tmpFile);

    store.save("file1", makeTestMetadata("file1.txt"));
    store.save("file2", makeTestMetadata("file2.txt"));

    auto entries = store.list();
    EXPECT_EQ(entries.size(), 2);
    std::vector<std::string> keys;
    for (auto& [key, _] : entries) keys.push_back(key);

    EXPECT_NE(std::find(keys.begin(), keys.end(), "file1"), keys.end());
    EXPECT_NE(std::find(keys.begin(), keys.end(), "file2"), keys.end());
}
