/**
 * Thread Safety Analysis: list() Operation
 * 
 * QUESTION: Is it safe to call list() without holding a lock during iteration?
 * ANSWER: YES, but with important caveats.
 */

// ==========================================
// SCENARIO 1: The Problem (Naive Approach)
// ==========================================

void naiveSearch() {
    // Thread 1: Get list of files
    std::vector<std::string> files = list("user1");  // ["file1", "file2", "file3"]
    
    // Thread 2: Deletes file2
    remove("user1", "file2");  // file2 is GONE
    
    // Thread 1: Try to read file2
    for (auto& file : files) {
        std::string content = read("user1", file);  // ❌ CRASH on "file2"!
    }
}

// Problem: The list is a snapshot from the PAST
// Files can be deleted AFTER we get the list
// Reading a deleted file causes exception/error

// ==========================================
// SOLUTION 1: Snapshot + Exception Handling (Current Implementation)
// ==========================================

std::vector<std::string> ThreadSafeFileManagement::list(const std::string& userID) {
    // JsonMetadataStore::list() does this:
    // 1. std::shared_lock lock(mtx);        ← Acquire read lock
    // 2. Copy all entries to vector         ← Create snapshot
    // 3. return vector;                     ← Release lock, return copy
    
    return innerManager->list(userID);
}

// Why this is SAFE:
// ✅ The vector returned is a COPY (not a reference)
// ✅ The copy was made UNDER LOCK (consistent snapshot)
// ✅ Even if metadata changes after return, our copy is unchanged

// Why this is STILL RISKY:
// ⚠️ The snapshot can become stale immediately
// ⚠️ Files in the list might be deleted before we access them
// ⚠️ New files might be created that we don't see

// ==========================================
// SOLUTION 2: Check-Then-Act Pattern (Our Implementation)
// ==========================================

std::vector<std::string> search(const std::string& userID, const std::string& content) {
    std::vector<std::string> results;
    std::vector<std::string> fileNames = list(userID);  // ✅ Get snapshot
    
    for (const auto& fileName : fileNames) {
        auto fileMtx = getLock(fileName);                // ✅ Lock this specific file
        std::shared_lock lock(*fileMtx);                 // ✅ Shared lock (allow parallel reads)
        
        try {
            // CRITICAL: Re-check existence under lock!
            if (!innerManager->exists(userID, fileName)) {
                continue;  // ✅ File deleted, skip safely
            }
            
            std::string content = innerManager->read(userID, fileName);  // ✅ Safe read
            // ... process content ...
        } catch (...) {
            continue;  // ✅ Handle any errors gracefully
        }
    }
    return results;
}

// Why this WORKS:
// ✅ list() gives consistent snapshot at time T
// ✅ exists() check happens under file lock (atomic)
// ✅ read() happens under same lock (no TOCTOU)
// ✅ Exception handling catches any race conditions

// ==========================================
// ALTERNATIVE: Lock During Entire Iteration (NOT RECOMMENDED)
// ==========================================

// BAD APPROACH - Don't do this!
std::vector<std::string> searchWithGlobalLock(const std::string& userID, const std::string& content) {
    std::unique_lock globalLock(someBigMutex);  // ❌ BLOCKS EVERYTHING
    
    std::vector<std::string> files = list(userID);
    for (auto& file : files) {
        // ... search in file ...
    }
    
    // Lock held for ENTIRE iteration - could be seconds!
    // No other thread can do ANYTHING with files during this time
    // ❌ TERRIBLE PERFORMANCE
}

// ==========================================
// GUARANTEES PROVIDED
// ==========================================

/*
1. SNAPSHOT CONSISTENCY:
   - list() returns a consistent snapshot of metadata at time T
   - No partial updates visible (e.g., file half-created)
   - Guaranteed by JsonMetadataStore's shared_mutex

2. PER-FILE ATOMICITY:
   - exists() + read() happens under same file lock
   - No TOCTOU (Time-Of-Check-Time-Of-Use) for individual files
   - Other operations on DIFFERENT files can proceed in parallel

3. GRACEFUL DEGRADATION:
   - If file deleted between list() and read(): Caught by exists() or catch block
   - If file created after list(): Not seen (acceptable for search)
   - If file modified during read(): Sees either old or new content (acceptable)

4. NO GUARANTEES:
   - ❌ List is not kept up-to-date during iteration
   - ❌ Might miss newly created files
   - ❌ Might try to access deleted files (but handled gracefully)
   
   These are ACCEPTABLE tradeoffs for better concurrency!
*/

// ==========================================
// RACE CONDITIONS THAT ARE STILL POSSIBLE (AND OK)
// ==========================================

/*
Race 1: File deleted between list() and exists()
   Thread 1: list() → ["file.txt"]
   Thread 2: remove("file.txt")
   Thread 1: exists("file.txt") → false
   Result: ✅ Skipped cleanly

Race 2: File created after list()
   Thread 1: list() → ["file1.txt"]
   Thread 2: create("file2.txt")
   Thread 1: search only finds file1, not file2
   Result: ✅ Acceptable (eventual consistency)

Race 3: File modified during read()
   Thread 1: exists("file.txt") → true
   Thread 1: read("file.txt") starts...
   Thread 2: write("file.txt", new content)
   Thread 1: ...read completes
   Result: ✅ Reads either old or new (both valid)

All of these are ACCEPTABLE for search operations!
The system is EVENTUALLY CONSISTENT, which is fine.
*/

// ==========================================
// WHEN WOULD WE NEED STRONGER GUARANTEES?
// ==========================================

/*
Scenario: Atomic batch operations
   - "Delete all files matching pattern"
   - "Backup all files to archive"
   - "Calculate total size of all files"

For these, you'd need to hold a read lock on the METADATA for the entire operation:

std::vector<std::string> atomicBackup(const std::string& userID) {
    // Hypothetical: metadata store exposes lock
    auto metadataLock = metadataStore->acquireSharedLock();
    
    std::vector<std::string> files = list(userID);
    for (auto& file : files) {
        // Files guaranteed to exist because we hold metadata lock
        backup(file);
    }
    
    return files;
}

But this would BLOCK all create/delete operations for the entire backup!
Trade-off: Consistency vs. Availability
*/

// ==========================================
// SUMMARY
// ==========================================

/*
Q: Is list() safe without lock during iteration?
A: YES, with proper error handling.

✅ list() returns a consistent snapshot (under lock)
✅ Iteration on snapshot is safe (it's a copy)
✅ Per-file operations re-check under lock (exists + read)
✅ Exception handling catches race conditions

⚠️ List can become stale (acceptable)
⚠️ Might miss new files (acceptable)
⚠️ Might reference deleted files (handled gracefully)

This design prioritizes AVAILABILITY and PERFORMANCE over
strict CONSISTENCY, which is the right choice for a file system!
*/
