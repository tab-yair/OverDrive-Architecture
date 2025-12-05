#include "file/management/ThreadSafeFileManagement.h"
#include <stdexcept>
#include <thread> // Necessary for std::thread, std::this_thread
#include <chrono> // Necessary for std::chrono

////////////////////////////////////////////////////////////////////////////////
// Constructor / Destructor
////////////////////////////////////////////////////////////////////////////////

ThreadSafeFileManagement::ThreadSafeFileManagement(std::unique_ptr<IFileManagement> manager)
    : innerManager(std::move(manager)), shouldStopCleanup(false), operationCount(0) {
    
    // Background thread for periodic cleanup (uses try_lock to avoid deadlock)
    cleanupThread = std::thread([this]() {
        std::unique_lock<std::mutex> lock(cleanupMutex);
        
        while (!shouldStopCleanup.load()) {
            // Wait for 5 minutes OR until woken up by destructor
            if (cleanupCV.wait_for(lock, std::chrono::minutes(5)) == std::cv_status::timeout) {
                // Timeout reached - time to cleanup
                if (!shouldStopCleanup.load()) {
                    lock.unlock(); // Release lock before cleanup
                    cleanupExpiredLocks(); // Safe cleanup with try_lock
                    lock.lock(); // Re-acquire for next wait
                }
            }
            // If woken up by notify (destructor), loop will exit
        }
    });
}

ThreadSafeFileManagement::~ThreadSafeFileManagement() {
    // Signal cleanup thread to stop
    shouldStopCleanup.store(true);
    
    // Wake up the cleanup thread immediately
    cleanupCV.notify_one();
    
    // Wait for thread to finish
    if (cleanupThread.joinable()) {
        cleanupThread.join();
    }
}

////////////////////////////////////////////////////////////////////////////////
// Lock Management (Lock Striping & Lazy Cleanup)
////////////////////////////////////////////////////////////////////////////////

std::shared_ptr<std::shared_mutex> ThreadSafeFileManagement::getLock(const std::string& fileName) const {
    size_t shardIdx = getShardIndex(fileName);
    LockShard& shard = lockShards[shardIdx];

    // Lock only the specific shard bucket, not the whole system
    std::lock_guard<std::mutex> lock(shard.mutex);

    auto it = shard.locks.find(fileName);
    if (it != shard.locks.end()) {
        if (auto ptr = it->second.lock()) {
            // Lock exists and is alive
            return ptr;
        }
        // Lock found but expired (weak_ptr is dead) -> Lazy cleanup
        shard.locks.erase(it);
    }

    // Create new lock
    auto newLock = std::make_shared<std::shared_mutex>();
    shard.locks[fileName] = newLock;
    return newLock;
}

void ThreadSafeFileManagement::cleanupExpiredLocks() const {
    // SAFE: Use try_lock to avoid deadlock when called during file operations
    // Iterate over all shards to remove dead weak_ptrs
    for (auto& shard : lockShards) {
        // Try to lock WITHOUT blocking - prevents deadlock
        if (shard.mutex.try_lock()) {
            // Got the lock! Clean expired entries
            for (auto it = shard.locks.begin(); it != shard.locks.end(); ) {
                if (it->second.expired()) {
                    it = shard.locks.erase(it);
                } else {
                    ++it;
                }
            }
            shard.mutex.unlock();
        }
        // If try_lock failed, skip this shard - lazy cleanup in getLock() will handle it
    }
}

void ThreadSafeFileManagement::opportunisticCleanup() {
    // Amortized cleanup: Triggered every 1000 operations
    if (++operationCount % 1000 == 0) {
        // Call cleanup with try_lock - safe even when called after file operations
        cleanupExpiredLocks();
    }
}

////////////////////////////////////////////////////////////////////////////////
// Basic File Operations
////////////////////////////////////////////////////////////////////////////////

void ThreadSafeFileManagement::create(const std::string& userID, const std::string& fileName, const std::string& content) {
    // NOTE: getLock() internally locks the relevant Shard Mutex to protect the map.
    auto fileMtx = getLock(fileName);
    
    {
        // Lock the specific file for writing
        std::unique_lock<std::shared_mutex> lock(*fileMtx);
        
        // CRITICAL: We do NOT lock a global 'MapMutex' here. 
        // We assume innerManager handles structural thread-safety (e.g., internal protections).
        // Locking globally here would negate the benefit of Sharding and risk deadlocks.
        innerManager->create(userID, fileName, content);
    }
    
    // Call cleanup AFTER releasing file lock to avoid deadlock
    opportunisticCleanup();
}

void ThreadSafeFileManagement::write(const std::string& userID, const std::string& fileName, const std::string& content) {
    auto fileMtx = getLock(fileName);
    
    {
        std::unique_lock<std::shared_mutex> lock(*fileMtx);
        innerManager->write(userID, fileName, content);
    }
    
    // Call cleanup AFTER releasing file lock to avoid deadlock
    opportunisticCleanup();
}

std::string ThreadSafeFileManagement::read(const std::string& userID, const std::string& fileName) {
    auto fileMtx = getLock(fileName);
    // Shared lock allows multiple readers for the same file
    std::shared_lock<std::shared_mutex> lock(*fileMtx);
    
    return innerManager->read(userID, fileName);
}

void ThreadSafeFileManagement::remove(const std::string& userID, const std::string& fileName) {
    // NOTE: getLock() protects the lock map insertion/retrieval.
    auto fileMtx = getLock(fileName);
    
    {
        // Exclusive lock ensures no one is reading/writing while we delete
        std::unique_lock<std::shared_mutex> lock(*fileMtx);
        innerManager->remove(userID, fileName);
    }
    
    // Call cleanup AFTER releasing file lock to avoid deadlock
    opportunisticCleanup();
}

bool ThreadSafeFileManagement::exists(const std::string& userID, const std::string& fileName) {
    auto fileMtx = getLock(fileName);
    // We need at least a shared_lock to ensure the file isn't being deleted *right now*
    std::shared_lock<std::shared_mutex> lock(*fileMtx);
    
    return innerManager->exists(userID, fileName);
}

////////////////////////////////////////////////////////////////////////////////
// Operations on Multiple Files
////////////////////////////////////////////////////////////////////////////////

std::vector<std::string> ThreadSafeFileManagement::list(const std::string& userID) {
    // THREAD-SAFETY NOTE:
    // This operation deals only with metadata (listing file names) and does not modify file contents.
    // We rely on the underlying IFileManagement (metadata store) to provide a consistent snapshot.
    // No file locks are acquired here because we're only reading metadata, not touching individual files.
    // The returned list may become stale immediately after this call (files added or removed), 
    // but callers should handle missing/deleted files gracefully.
    return innerManager->list(userID);
}

std::vector<std::string> ThreadSafeFileManagement::search(const std::string& userID, const std::string& content) {
    std::vector<std::string> results;
    // if content.empty() return empty results
    if (content.empty()) {
        return results;
    }
    
    // 1. Get snapshot (May contain files that will be deleted during iteration)
    std::vector<std::string> fileNames = list(userID);

    for (const auto& fileName : fileNames) {
        // Optimization: Check filename first (No I/O, No Locks)
        if (fileName.find(content) != std::string::npos) {
            results.push_back(fileName);
            continue;
        }

        // 2. Lock and Read content
        auto fileMtx = getLock(fileName);
        std::shared_lock<std::shared_mutex> lock(*fileMtx);

        try {
            // Race Condition Handling:
            // The file might have been deleted between list() and lock().
            // innerManager->read should throw if file is missing.
            std::string fileContent = innerManager->read(userID, fileName);
            if (fileContent.find(content) != std::string::npos) {
                results.push_back(fileName);
            }
        } catch (...) {
            // File deleted or inaccessible - skip and continue
            continue;
        }
    }
    return results;
}