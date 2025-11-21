#ifndef MOCK_FILE_MANAGER_H
#define MOCK_FILE_MANAGER_H

#include "../../src/file/IFileManagement.h"
#include <string>
#include <vector>
#include <stdexcept>

/**
 * Mock class for IFileManagement to be used in unit tests.
 * Captures calls and parameters to allow verification.
 */
class MockFileManager : public IFileManagement {
public:
    // For create method
    bool createCalled = false;
    std::string lastCreatedFilename;
    std::string lastCreatedContent;
    bool throwOnCreate = false;

    // For exists method
    bool existsCalled = false;
    std::string lastCheckedPath;
    bool existsReturnValue = false;

    // For read method
    bool readCalled = false;
    std::string lastReadFilename;
    bool throwOnRead = false;
    std::string readReturnValue = "";

    // For searchContent method
    bool searchContentCalled = false;
    std::string lastSearchContent;
    std::vector<std::string> searchContentReturnValue;

    // Implement create: record params, optionally throw
    void create(const std::string& fileName, const std::string& content = "") override {
        createCalled = true;
        lastCreatedFilename = fileName;
        lastCreatedContent = content;

        if (throwOnCreate) {
            throw std::runtime_error("Mock: Simulated create error.");
        }
    }

    // Implement exists: record params, return preset value
    bool exists(const std::string& fileName) override {
        existsCalled = true;
        lastCheckedPath = fileName;
        return existsReturnValue;
    }

    // Implement read: record params, optionally throw, return preset value
    std::string read(const std::string& fileName) override {
        readCalled = true;
        lastReadFilename = fileName;
        if (throwOnRead) {
            throw std::runtime_error("Mock: Simulated read error.");
        }
        return readReturnValue;
    }

    // Implement remove (optional - no need to track)
    void remove(const std::string& /*fileName*/) override {
        // No action needed for tests currently
    }

    // Implement write (optional - no need to track)
    void write(const std::string& /*fileName*/, const std::string& /*content*/) override {
        // No action needed for tests currently
    }

    // Implement fileList (optional - no need to track)
    std::vector<std::string> fileList() override {
        return {};
    }

    // Implement searchContent: record params, return preset vector
    std::vector<std::string> searchContent(const std::string& content) override {
        searchContentCalled = true;
        lastSearchContent = content;
        return searchContentReturnValue;
    }
};

#endif // MOCK_FILE_MANAGER_H
