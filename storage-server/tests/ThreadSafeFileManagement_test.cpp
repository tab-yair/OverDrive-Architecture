#include <gtest/gtest.h>
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>
#include <unordered_map>
#include <memory>
#include "file/management/ThreadSafeFileManagement.h"

// =================================================================
// Unsafe Fake - Simulates a raw file manager without locking.
// Used to verify that the wrapper actually enforces thread safety.
// =================================================================
class UnsafeFakeFileManager : public IFileManagement {
    std::unordered_map<std::string, std::string> files; 

public:
    void create(const std::string& fileName, const std::string& content = "") override {
        std::this_thread::sleep_for(std::chrono::microseconds(10)); 
        if (files.count(fileName)) throw std::runtime_error("File exists");
        files[fileName] = content;
    }
    
    void write(const std::string& fileName, const std::string& content) override {
        std::this_thread::sleep_for(std::chrono::microseconds(10)); 
        if (!files.count(fileName)) throw std::runtime_error("File missing");
        files[fileName] = content; 
    }
    
    std::string read(const std::string& fileName) override {
        if (!files.count(fileName)) throw std::runtime_error("File missing");
        return files[fileName];
    }
    
    void remove(const std::string& fileName) override {
        std::this_thread::sleep_for(std::chrono::microseconds(10)); 
        if (!files.count(fileName)) throw std::runtime_error("File missing");
        files.erase(fileName);
    }
    
    bool exists(const std::string& fileName) override {
        return files.count(fileName) != 0;
    }
    
    std::vector<std::string> list() override { return {}; }
    std::vector<std::string> search(const std::string& content) override { return {}; }
};

// =================================================================
// Tests
// =================================================================

// Test high contention on a single file with many threads
TEST(ThreadSafeFileManagementTest, HeavyContentionOnSingleFile) {
    auto unsafeFake = std::make_unique<UnsafeFakeFileManager>();
    ThreadSafeFileManagement tfm(std::move(unsafeFake));

    const int NUM_THREADS = 70;
    const int OPS_PER_THREAD = 100;
    const std::string SHARED_FILE = "shared_config.txt";
    const std::string USER = "admin";

    tfm.create(SHARED_FILE, "INITIAL");

    std::atomic<int> errors{0};
    std::vector<std::thread> threads;

    for (int i = 0; i < NUM_THREADS; ++i) {
        threads.emplace_back([&, i]() {
            for (int j = 0; j < OPS_PER_THREAD; ++j) {
                try {
                    std::string data = "T" + std::to_string(i) + "_Iter" + std::to_string(j);
                    tfm.write(SHARED_FILE, data);
                    std::string readBack = tfm.read(SHARED_FILE);
                    if (readBack.empty()) errors++;
                } catch (...) {
                    errors++;
                }
            }
        });
    }

    for (auto& t : threads) {
        if (t.joinable()) t.join();
    }

    EXPECT_EQ(errors.load(), 0);
    EXPECT_TRUE(tfm.exists(SHARED_FILE));
}

// Test multiple readers and writers on the same file
TEST(ThreadSafeFileManagementTest, ReadersWritersScenario) {
    auto unsafeFake = std::make_unique<UnsafeFakeFileManager>();
    ThreadSafeFileManagement tfm(std::move(unsafeFake));
    
    const std::string SHARED_FILE = "readme.txt";
    const std::string USER = "user1";
    const int NUM_UPDATES = 100;
    
    tfm.create(SHARED_FILE, "START");
    
    std::atomic<bool> running{true};
    std::atomic<bool> writerFinished{false};
    std::atomic<int> readErrors{0};
    std::atomic<int> successfulReads{0};
    std::vector<std::thread> readers;
    
    // 10 Reader threads
    for(int i=0; i<10; ++i) {
        readers.emplace_back([&]() {
            while(running) {
                try {
                    std::string s = tfm.read(SHARED_FILE);
                    if (!s.empty()) successfulReads++;
                } catch(...) {
                    readErrors++;
                }
            }
        });
    }
    
    // 1 Writer thread
    std::thread writer([&]() {
        for(int i=0; i<NUM_UPDATES; ++i) {
            try {
                tfm.write(SHARED_FILE, "Update_" + std::to_string(i));
            } catch(...) {
                readErrors++;
            }
            // Sleep to simulate work and allow readers to read intermediate states
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
        writerFinished = true;
    });
    
    writer.join();
    EXPECT_TRUE(writerFinished.load());
    
    running = false;
    for(auto& t : readers) t.join();
    
    EXPECT_EQ(readErrors.load(), 0);
    // Expect many reads to succeed while writer was working
    EXPECT_GT(successfulReads.load(), NUM_UPDATES);
    
    std::string finalContent = tfm.read(SHARED_FILE);
    EXPECT_EQ(finalContent, "Update_" + std::to_string(NUM_UPDATES - 1));
}