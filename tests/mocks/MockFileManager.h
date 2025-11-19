#ifndef MOCK_FILE_MANAGER_H
#define MOCK_FILE_MANAGER_H

#include "../../src/FileManagement/FileManager.h"
#include <string>
#include <vector>
#include <stdexcept>
#include <cstdint>

/**
 * a mock class for FileManager to be used in unit tests.
 * It captures method calls and parameters for verification
 */
class MockFileManager : public FileManager {
public:
    // data captured from create calls
    std::string lastCreatedFilename;
    std::string lastCreatedContent; 
    bool createCalled = false;
    
    // data captured from exists calls
    bool existsCalled = false;
    bool readFileCalled = false; // a flag to indicate if readFile was called
    std::string lastCheckedPath;
    std::string lastReadPath; // captures the path used in readFile

    // flags to control behavior
    bool existsReturnValue = false; // what exists should return
    bool throwOnCreate = false;     // if true, create will throw an exception
    std::string readFileContent = ""; // the content that readFile should return*

    // capture create calls to verify parameters
    void create(const std::string& fileName, const std::string& content) override {
        createCalled = true;
        lastCreatedFilename = fileName;
        lastCreatedContent = content;
        
        if (throwOnCreate) {
            throw std::runtime_error("Mock: Simulation of file creation error (e.g., file already exists or permission denied).");
        }
    }

    // capture exists calls to verify parameters
    bool exists(const std::string& path) override {
        existsCalled = true;
        lastCheckedPath = path;
        return existsReturnValue; 
    }
    
    // let us simulate reading a file
    std::string readFile(const std::string& path) override {
        readFileCalled = true;
        lastReadPath = path;
        return readFileContent; 
    }

    // Other FileManager methods can be similarly mocked if needed
    bool createDirectory(const std::string& path) override { return true; }
    bool deleteFile(const std::string& path) override { return true; }
    bool writeFile(const std::string& path, const std::string& content) override { return true; }
};

#endif // MOCK_FILE_MANAGER_H