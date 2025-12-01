#include "HashPathMapper.h"
#include <gtest/gtest.h>
#include <fstream>
#include <set>

class HashPathMapperTest : public ::testing::Test {
protected:
    std::filesystem::path testDir;
    
    void SetUp() override {
        testDir = std::filesystem::temp_directory_path() / "hash_mapper_test";
        std::filesystem::create_directories(testDir);
    }
    
    void TearDown() override {
        if (std::filesystem::exists(testDir)) {
            std::filesystem::remove_all(testDir);
        }
    }
};

// Test 1: Basic functionality - same input = same output
TEST_F(HashPathMapperTest, Deterministic) {
    HashPathMapper mapper(testDir);
    
    auto path1 = mapper.resolve("user123/file.txt");
    auto path2 = mapper.resolve("user123/file.txt");
    
    EXPECT_EQ(path1, path2);
    EXPECT_EQ(path1.filename().string().length(), 64);  // Full SHA256
}

// Test 2: No collisions with many files
TEST_F(HashPathMapperTest, NoCollisions) {
    HashPathMapper mapper(testDir);
    std::set<std::filesystem::path> paths;
    
    // Test 10,000 different logical paths
    for (int i = 0; i < 10000; ++i) {
        std::string logicalPath = "user" + std::to_string(i) + "/file.txt";
        paths.insert(mapper.resolve(logicalPath));
    }
    
    EXPECT_EQ(paths.size(), 10000);  // All unique
}

// Test 3: Real usage - write and read files
TEST_F(HashPathMapperTest, FileOperations) {
    HashPathMapper mapper(testDir);
    
    // Write files for different users
    auto path1 = mapper.resolve("user1/document.txt");
    auto path2 = mapper.resolve("user2/document.txt");
    
    std::ofstream(path1) << "User 1 content";
    std::ofstream(path2) << "User 2 content";
    
    // Verify files exist and are different
    EXPECT_TRUE(std::filesystem::exists(path1));
    EXPECT_TRUE(std::filesystem::exists(path2));
    EXPECT_NE(path1, path2);
    
    // Read back and verify content
    std::ifstream file1(path1);
    std::string content1((std::istreambuf_iterator<char>(file1)),
                         std::istreambuf_iterator<char>());
    
    EXPECT_EQ(content1, "User 1 content");
}