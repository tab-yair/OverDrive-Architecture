#pragma once // only include this header once per compilation unit
#include "../../src/file/IFileManagement.h"
#include <string>
#include <vector>
#include <stdexcept>
#include <memory>

class MockFileManager : public IFileManagement {
public:

    // ------------------------------
    // Flags for verifying calls
    // ------------------------------
    bool postCalled = false;
    bool readCalled = false;
    bool existsCalled = false;
    bool searchContentCalled = false;
    bool deleteCalled = false;

    // ------------------------------
    // Behavior control (what to return)
    // ------------------------------
    bool existsReturnValue = false;

    std::string readReturnValue = "";
    std::vector<std::string> searchContentReturnValue = {};

    // ------------------------------
    // Exception triggers
    // ------------------------------
    bool throwOnRead = false;
    bool throwOnSearchContent = false;
    bool throwOnDelete = false;
    bool throwOnPost = false;

    // ------------------------------
    // Track last parameters
    // ------------------------------
    int lastClientId = -1;

    std::string lastFileName = "";
    std::string lastContent = "";

    std::string lastSearchContent = "";


    // ===========================================================
    // IFileManagement interface methods
    // ===========================================================

    bool exists(int clientId, const std::string& fileName) override {
        existsCalled = true;
        lastClientId = clientId;
        lastFileName = fileName;
        return existsReturnValue;
    }

    void post(int clientId, const std::string& fileName, const std::string& content) override {
        postCalled = true;
        lastClientId = clientId;
        lastFileName = fileName;
        lastContent = content;

        if (throwOnPost) {
            throw std::runtime_error("Mock: post error");
        }
    }

    std::string read(int clientId, const std::string& fileName) override {
        readCalled = true;
        lastClientId = clientId;
        lastFileName = fileName;

        if (throwOnRead) {
            throw std::runtime_error("Mock: read error");
        }
        return readReturnValue;
    }

    std::vector<std::string> searchContent(int clientId, const std::string& term) override {
        searchContentCalled = true;
        lastClientId = clientId;
        lastSearchContent = term;

        if (throwOnSearchContent) {
            throw std::runtime_error("Mock: searchContent error");
        }
        return searchContentReturnValue;
    }

    void deleteFile(int clientId, const std::string& fileName) override {
        deleteCalled = true;
        lastClientId = clientId;
        lastFileName = fileName;

        if (throwOnDelete) {
            throw std::runtime_error("Mock: delete error");
        }
    }
};
