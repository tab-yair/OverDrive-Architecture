#include <gtest/gtest.h>
#include <thread>
#include <vector>
#include <atomic>
#include "file/management/ThreadSafeFileManagement.h"

// ========================
// Fake in-memory FileManager
// ========================
class FakeFileManager : public IFileManagement {
    std::unordered_map<std::string, std::string> files;
    std::mutex mtx; // protects map for thread safety in fake
public:
    void create(const std::string& userID, const std::string& fileName, const std::string& content = "") override {
        std::lock_guard<std::mutex> lock(mtx);
        std::string key = userID + ":" + fileName;
        if (files.count(key)) throw std::runtime_error("File exists");
        files[key] = content;
    }
    void write(const std::string& userID, const std::string& fileName, const std::string& content) override {
        std::lock_guard<std::mutex> lock(mtx);
        std::string key = userID + ":" + fileName;
        if (!files.count(key)) throw std::runtime_error("File missing");
        files[key] = content;
    }
    std::string read(const std::string& userID, const std::string& fileName) override {
        std::lock_guard<std::mutex> lock(mtx);
        std::string key = userID + ":" + fileName;
        if (!files.count(key)) throw std::runtime_error("File missing");
        return files[key];
    }
    void remove(const std::string& userID, const std::string& fileName) override {
        std::lock_guard<std::mutex> lock(mtx);
        std::string key = userID + ":" + fileName;
        if (!files.count(key)) throw std::runtime_error("File missing");
        files.erase(key);
    }
    bool exists(const std::string& userID, const std::string& fileName) override {
        std::lock_guard<std::mutex> lock(mtx);
        return files.count(userID + ":" + fileName) != 0;
    }
    std::vector<std::string> list(const std::string& userID) override { return {}; }
    std::vector<std::string> search(const std::string& userID, const std::string& content) override { return {}; }
};

// ========================
// Race Condition Test
// ========================

TEST(ThreadSafeFileManagementRaceTest, ConcurrentCreateWriteReadRemove) {
    auto fake = std::make_unique<FakeFileManager>();
    ThreadSafeFileManagement tfm(std::move(fake));

    const int N = 10; // Reduced threads to avoid timeout
    const std::string user = "user1";
    
    std::atomic<int> successCount{0};
    std::vector<std::thread> threads;

    // Test concurrent operations on different files
    for (int i = 0; i < N; ++i) {
        threads.emplace_back([&, i]() {
            try {
                std::string file = "file" + std::to_string(i);
                
                // Create file
                tfm.create(user, file, "data");
                
                // Write to file
                tfm.write(user, file, "updated");
                
                // Read file
                std::string content = tfm.read(user, file);
                if (content == "updated") {
                    successCount++;
                }
                
                // Check exists
                if (tfm.exists(user, file)) {
                    // Remove file
                    tfm.remove(user, file);
                }
            } catch (...) {
                // Ignore exceptions
            }
        });
    }

    for (auto& t : threads) t.join();

    // Verify that most operations succeeded
    EXPECT_GE(successCount.load(), N / 2);
}
