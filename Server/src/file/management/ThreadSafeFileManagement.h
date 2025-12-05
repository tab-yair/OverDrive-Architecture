#ifndef THREADSAFEFILEMANAGEMENT_H
#define THREADSAFEFILEMANAGEMENT_H

#include "file/management/IFileManagement.h"
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <condition_variable>
#include <unordered_map>
#include <vector>
#include <string>
#include <array>
#include <functional>
#include <thread>
#include <atomic>

class ThreadSafeFileManagement : public IFileManagement {
private:
    // ===========================
    // Cleanup Variables
    // ===========================
    std::atomic<bool> shouldStopCleanup;
    std::condition_variable cleanupCV;
    std::mutex cleanupMutex;
    std::thread cleanupThread;
    std::atomic<size_t> operationCount;            

    // ===========================
    // Inner File Management
    // ===========================
    std::unique_ptr<IFileManagement> innerManager; // Underlying file management

    // ===========================
    // Locks / Sharded Lock Map
    // ===========================
    static constexpr size_t NUM_SHARDS = 16;
    
    struct LockShard {
        std::unordered_map<std::string, std::weak_ptr<std::shared_mutex>> locks;
        mutable std::mutex mutex;
    };
    
    mutable std::array<LockShard, NUM_SHARDS> lockShards;

    // ===========================
    // Private Helper Functions
    // ===========================
    size_t getShardIndex(const std::string& fileName) const {
        return std::hash<std::string>{}(fileName) % NUM_SHARDS;
    }

    std::shared_ptr<std::shared_mutex> getLock(const std::string& fileName) const;
    void cleanupExpiredLocks() const;
    void opportunisticCleanup();

public:
    // ===========================
    // Constructor / Destructor
    // ===========================
    ThreadSafeFileManagement(std::unique_ptr<IFileManagement> innerManager);
    ~ThreadSafeFileManagement();

    // ===========================
    // Public File Operations
    // ===========================
    virtual void create(const std::string& userID, const std::string& fileName, const std::string& content = "") override;
    virtual void write(const std::string& userID, const std::string& fileName, const std::string& content) override;
    virtual std::string read(const std::string& userID, const std::string& fileName) override;
    virtual void remove(const std::string& userID, const std::string& fileName) override;
    virtual bool exists(const std::string& userID, const std::string& fileName) override;
    virtual std::vector<std::string> list(const std::string& userID) override;
    virtual std::vector<std::string> search(const std::string& userID, const std::string& content) override;
};

#endif // THREADSAFEFILEMANAGEMENT_H
