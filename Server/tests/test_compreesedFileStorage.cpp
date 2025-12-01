#include <gtest/gtest.h>
#include "CompressedFileStorage.h"
#include <unordered_map>

// --- Mock Classes ---

// Simple DummyCompressor that wraps text with "C_..._C"
class DummyCompressor : public ICompressor {
public:
    std::string compress(const std::string& data) override {
        return "C_" + data + "_C";
    }
    
    std::string decompress(const std::string& data) override {
        // Remove "C_" prefix and "_C" suffix
        if (data.size() >= 4 && data.substr(0, 2) == "C_" && data.substr(data.size() - 2) == "_C") {
            return data.substr(2, data.size() - 4);
        }
        return data;
    }
};

// Simple DummyStorage that stores in memory using a map
class DummyStorage : public IFileStorage {
public:
    std::unordered_map<std::string, std::string> files;
    
    void writeFile(const std::filesystem::path& path, const std::string& content) override {
        files[path.string()] = content;
    }
    
    std::string readFile(const std::filesystem::path& path) override {
        if (files.find(path.string()) == files.end()) {
            throw std::runtime_error("File not found");
        }
        return files[path.string()];
    }
    
    void deleteFile(const std::filesystem::path& path) override {
        files.erase(path.string());
    }
};

// --- Helper function to build the tested object ---
static std::unique_ptr<CompressedFileStorage> makeTestStorage(
        DummyCompressor*& compOut,
        DummyStorage*& storeOut) 
{
    auto comp = std::make_unique<DummyCompressor>();
    auto storage = std::make_unique<DummyStorage>();

    compOut = comp.get();
    storeOut = storage.get();

    return std::make_unique<CompressedFileStorage>(
        std::move(comp), 
        std::move(storage)
    );
}

// --------------------------------------------------
// TEST 1 – writeFile: verifies that data is compressed before being stored
// --------------------------------------------------
TEST(CompressedFileStorageTests, WriteFile_CompressesBeforeStore) {
    DummyCompressor* comp;
    DummyStorage* store;
    auto sut = makeTestStorage(comp, store);

    sut->writeFile("abc.txt", "HELLO");

    ASSERT_TRUE(store->files.find("abc.txt") != store->files.end());
    EXPECT_EQ(store->files["abc.txt"], "C_HELLO_C");
}

// --------------------------------------------------
// TEST 2 – readFile: verifies that read content is decompressed
// --------------------------------------------------
TEST(CompressedFileStorageTests, ReadFile_DecompressesStoredData) {
    DummyCompressor* comp;
    DummyStorage* store;
    auto sut = makeTestStorage(comp, store);

    // Manually store pre-compressed text
    store->files["x.txt"] = "C_DATA_C";

    std::string result = sut->readFile("x.txt");
    EXPECT_EQ(result, "DATA");
}

// --------------------------------------------------
// TEST 3 – deleteFile: verifies deletion is forwarded to the underlying storage
// --------------------------------------------------
TEST(CompressedFileStorageTests, DeleteFile_Forwarded) {
    DummyCompressor* comp;
    DummyStorage* store;
    auto sut = makeTestStorage(comp, store);

    store->files["del.txt"] = "C_X_C";

    sut->deleteFile("del.txt");

    EXPECT_FALSE(store->files.find("del.txt") != store->files.end());
}
