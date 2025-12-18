#pragma once // only include this header once per compilation unit
#include "file/management/IFileManagement.h"
#include <string>
#include <vector>
#include <stdexcept>
#include <memory>

class MockFileManager : public IFileManagement {
public:

    // ------------------------------
    // Flags for verifying calls
    // ------------------------------
    bool createCalled = false;  // Alias for postCalled
    bool postCalled = false;
    bool readCalled = false;
    bool existsCalled = false;
    bool searchCalled = false;
    bool deleteCalled = false;
    bool removeCalled = false;  // Alias for deleteCalled

    // ------------------------------
    // Behavior control (what to return)
    // ------------------------------
    bool existsReturnValue = false;

    std::string readReturnValue = "";
    std::vector<std::string> searchReturnValue = {};

    // ------------------------------
    // Exception triggers
    // ------------------------------
    bool throwOnRead = false;
    bool throwOnSearch = false;
    bool throwOnDelete = false;
    bool throwOnRemove = false;  // Alias for throwOnDelete
    bool throwOnPost = false;

    // ------------------------------
    // Track last parameters
    // ------------------------------
    std::string lastFileName = "";
    std::string lastCreatedFilename = "";  // Alias for lastFileName
    std::string lastRemovedFilename = "";  // Tracks last removed file
    std::string lastCheckedPath = "";      // Tracks last exists() path
    std::string lastContent = "";
    std::string lastCreatedContent = "";   // Alias for lastContent

    std::string lastSearch = "";


    // ===========================================================
    // IFileManagement interface methods
    // ===========================================================

    bool exists(const std::string& fileName) override {
        existsCalled = true;
        lastFileName = fileName;
        lastCheckedPath = fileName;
        return existsReturnValue;
    }

    void create(const std::string& fileName, const std::string& content = "") override {
        createCalled = true;
        postCalled = true;
        lastFileName = fileName;
        lastCreatedFilename = fileName;
        lastContent = content;
        lastCreatedContent = content;

        if (throwOnPost) {
            throw std::runtime_error("Mock: post error");
        }
    }

    void write(const std::string& fileName, const std::string& content) override {
        // Same as create for mock purposes
        create(fileName, content);
    }

    std::string read(const std::string& fileName) override {
        readCalled = true;
        lastFileName = fileName;

        if (throwOnRead) {
            throw std::runtime_error("Mock: read error");
        }
        return readReturnValue;
    }

    std::vector<std::string> search(const std::string& term) override {
        searchCalled = true;
        lastSearch = term;

        if (throwOnSearch) {
            throw std::runtime_error("Mock: search error");
        }
        return searchReturnValue;
    }

    void remove(const std::string& fileName) override {
        deleteCalled = true;
        removeCalled = true;
        lastFileName = fileName;
        lastRemovedFilename = fileName;

        if (throwOnDelete || throwOnRemove) {
            throw std::runtime_error("Mock: delete error");
        }
    }

    std::vector<std::string> list() override {
        // Simple mock implementation
        return searchReturnValue; // Reuse search return value for simplicity
    }
};
