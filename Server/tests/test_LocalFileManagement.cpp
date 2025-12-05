#include <gtest/gtest.h>
#include <filesystem>
#include <fstream>
#include <algorithm>
#include "file/management/LocalFileManagement.h"
#include "file/path/IPathMapper.h"
#include "file/storage/IFileStorage.h"
#include "file/metadata/IMetadataStore.h"

namespace fs = std::filesystem;

// ========================
// Fake / Minimal Implementations
// ========================

class TempPathMapper : public IPathMapper {
    fs::path tempDir;
public:
    TempPathMapper(const fs::path& dir) : tempDir(dir) {}
    fs::path resolve(const std::string& logicalFileName) const override {
        return tempDir / logicalFileName;
    }
};

class SimpleFileStorage : public IFileStorage {
public:
    void writeFile(const fs::path& p, const std::string &content = "") override {
        std::ofstream ofs(p);
        ofs << content;
    }
    std::string readFile(const fs::path& p) override {
        std::ifstream ifs(p);
        if (!ifs) throw std::runtime_error("File missing");
        return std::string((std::istreambuf_iterator<char>(ifs)),
                           std::istreambuf_iterator<char>());
    }
    void deleteFile(const fs::path& p) override {
        fs::remove(p);
    }
};

class SimpleMetadataStore : public IMetadataStore {
    std::unordered_map<std::string, FileMetaData> store;
public:
    void save(const std::string& name, const FileMetaData& meta) override { store[name] = meta; }
    std::optional<FileMetaData> load(const std::string& name) const override {
        auto it = store.find(name);
        if (it != store.end()) return it->second;
        return {};
    }
    void remove(const std::string& name) override { store.erase(name); }
    bool exists(const std::string& name) const override { return store.count(name) != 0; }
    std::vector<std::pair<std::string, FileMetaData>> list() const override { 
        return std::vector<std::pair<std::string, FileMetaData>>(store.begin(), store.end());
    }
};

// ========================
// Test Fixture
// ========================

class LocalFileManagementTest : public ::testing::Test {
protected:
    fs::path tempDir;
    std::unique_ptr<LocalFileManagement> lf;

    void SetUp() override {
        tempDir = fs::temp_directory_path() / "lfm_test_dir";
        fs::create_directory(tempDir);

        auto mapper = std::make_unique<TempPathMapper>(tempDir);
        auto storage = std::make_unique<SimpleFileStorage>();
        auto metadata = std::make_unique<SimpleMetadataStore>();

        lf = std::make_unique<LocalFileManagement>(std::move(mapper),
                                                   std::move(storage),
                                                   std::move(metadata));
    }

    void TearDown() override {
        fs::remove_all(tempDir);
    }
};

// ========================
// Tests
// ========================

// Create + Read a file successfully
TEST_F(LocalFileManagementTest, CreateAndRead) {
    lf->create("user1", "file1.txt", "Hello World");
    std::string content = lf->read("user1", "file1.txt");
    EXPECT_EQ(content, "Hello World");
}

// Create file with duplicate name -> should throw
TEST_F(LocalFileManagementTest, CreateDuplicateThrows) {
    lf->create("user1", "file2.txt", "First");
    EXPECT_THROW(lf->create("user1", "file2.txt", "Second"), std::runtime_error);
}

// Write to existing file
TEST_F(LocalFileManagementTest, WriteUpdatesContent) {
    lf->create("user1", "file3.txt", "Initial");
    lf->write("user1", "file3.txt", "Updated");
    EXPECT_EQ(lf->read("user1", "file3.txt"), "Updated");
}

// Write to non-existent file -> should throw
TEST_F(LocalFileManagementTest, WriteNonExistentThrows) {
    EXPECT_THROW(lf->write("user1", "nonexistent.txt", "data"), std::runtime_error);
}

// Remove existing file
TEST_F(LocalFileManagementTest, RemoveExistingFile) {
    lf->create("user1", "file4.txt", "content");
    lf->remove("user1", "file4.txt");
    EXPECT_FALSE(lf->exists("user1", "file4.txt"));
}

// Remove non-existent file -> should throw
TEST_F(LocalFileManagementTest, RemoveNonExistentThrows) {
    EXPECT_THROW(lf->remove("user1", "missing.txt"), std::runtime_error);
}

// List files 
TEST_F(LocalFileManagementTest, ListFilesUserScoped) {
    lf->create("user1", "f1.txt");
    lf->create("user1", "f2.txt");
    lf->create("user2", "other.txt");

    auto userFiles = lf->list("user1");
    EXPECT_EQ(userFiles.size(), 3);
    EXPECT_TRUE(std::find(userFiles.begin(), userFiles.end(), "f1.txt") != userFiles.end());
    EXPECT_TRUE(std::find(userFiles.begin(), userFiles.end(), "f2.txt") != userFiles.end());
    EXPECT_TRUE(std::find(userFiles.begin(), userFiles.end(), "other.txt") != userFiles.end());
}

// Search for content (good case)
TEST_F(LocalFileManagementTest, SearchFindsContent) {
    lf->create("user1", "search1.txt", "findme");
    lf->create("user1", "search2.txt", "nomatch");

    auto results = lf->search("user1", "findme");
    EXPECT_EQ(results.size(), 1);
    EXPECT_EQ(results[0], "search1.txt");
}

// Search for non-existent content -> empty results
TEST_F(LocalFileManagementTest, SearchEmpty) {
    lf->create("user1", "file1.txt", "abc");
    auto results = lf->search("user1", "xyz");
    EXPECT_TRUE(results.empty());
}
