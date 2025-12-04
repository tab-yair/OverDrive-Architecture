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
    bool searchCalled = false;
    bool deleteCalled = false;

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
    bool throwOnPost = false;

    // ------------------------------
    // Track last parameters
    // ------------------------------
    int lastClientId = -1;

    std::string lastFileName = "";
    std::string lastContent = "";

    std::string lastSearch = "";


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

    std::vector<std::string> search(int clientId, const std::string& term) override {
        searchCalled = true;
        lastClientId = clientId;
        lastSearch = term;

        if (throwOnSearch) {
            throw std::runtime_error("Mock: search error");
        }
        return searchReturnValue;
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
