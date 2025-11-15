#include "gtest/gtest.h"
#include "../src/commands/AddCommand.h"
#include "../src/FileManagement/FileManager.h"
#include "../src/compression/ICompressor.h"
#include <memory>
#include <cstdlib>
#include <string>
#include <vector>
#include <algorithm>



// ---------------- Helper Mock Classes ----------------

// A manual 'Mock' for the FileManager. This class pretends to interact with 
// the file system but only captures the input data locally.
class MockFileManager : public FileManager {
public:
    std::string lastWrittenPath;
    std::vector<uint8_t> lastWrittenData;
    bool fileExists = false; 
    bool writeCalled = false;
    bool returnStatus = true; // Controls the return value of writeFile
    
    // We override 'exists' to allow us to control the test scenario (e.g., simulating file already exists).
    bool exists(const std::string& path) override {
        (void)path; // Avoid unused parameter warning
        return fileExists;
    }

    // We override 'writeFile' to capture the file path and content. 
    // This ensures we never touch the actual hard drive during the test.
    bool writeFile(const std::string& path, const std::vector<uint8_t>& data) override {
        writeCalled = true;
        lastWrittenPath = path;
        lastWrittenData = data;
        return returnStatus; // We assume the write operation succeeds for this test's purpose
    }
};

// A manual 'Stub' for the Compressor. This class provides a fixed, predictable 
// "compression" result, allowing us to focus only on the AddCommand's logic.
class MockCompressor : public Compressor {
public:
    // We use a simple reversal as a predictable, controlled "compression" logic for the test.
    // This allows us to easily predict the output vector.
    std::vector<uint8_t> compress(const std::vector<uint8_t>& data) override {
        std::vector<uint8_t> reversed = data;
        std::reverse(reversed.begin(), reversed.end());
        return reversed;
    }

    // Required by the base interface, but not used by AddCommand
    std::vector<uint8_t> decompress(const std::vector<uint8_t>& data) override {
        return data; 
    }
};


// ---------------- Test Environment Setup ----------------

// The Fixture class holds shared setup logic and resources for all AddCommand tests.
class AddCommandTest : public ::testing::Test {
protected:
    std::shared_ptr<MockFileManager> mockFileManager;
    std::shared_ptr<MockCompressor> mockCompressor;
    std::unique_ptr<AddCommand> addCommand;
    std::string tempDir = "/overdrive_path/"; 

    // Runs before every single test case (TEST_F)
    void SetUp() override {
        // 1. Dependency Injection: Create the mock objects and pass them to the command.
        mockFileManager = std::make_shared<MockFileManager>();
        mockCompressor = std::make_shared<MockCompressor>();
        addCommand = std::make_unique<AddCommand>(mockFileManager, mockCompressor);

        // 2. Environment Setup: Set up the required environment variable for path construction.
        // The '1' ensures the variable is overwritten if it already exists.
        setenv("OVERDRIVE_PATH", tempDir.c_str(), 1);
    }

    // Runs after every single test case (TEST_F)
    void TearDown() override {
        // Cleans up the environment to prevent side effects on other tests.
        unsetenv("OVERDRIVE_PATH");
    }
};


// ---------------- The Tests ----------------

// Test 1: Verifies that the command does nothing when no arguments are provided.
TEST_F(AddCommandTest, NoArguments_DoesNothing) {
    std::vector<std::string> args = {};
    addCommand->execute(args);
    EXPECT_FALSE(mockFileManager->writeCalled);
}

// Test 2: Verifies that an empty file is created when only the filename is provided.
TEST_F(AddCommandTest, OneArgument_CreatesEmptyFile) {
    std::vector<std::string> args = {"hello"};
    addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->writeCalled);
    EXPECT_EQ(mockFileManager->lastWrittenPath, tempDir + "hello");
    // Empty input -> reversed empty -> empty output.
    EXPECT_TRUE(mockFileManager->lastWrittenData.empty());
}

// Test 3: Verifies that the command correctly compresses the text and calls the file writer.
TEST_F(AddCommandTest, FilenameAndText_WritesCompressedData) {
    std::vector<std::string> args = {"note", "HELLO"};
    addCommand->execute(args);

    EXPECT_TRUE(mockFileManager->writeCalled);
    EXPECT_EQ(mockFileManager->lastWrittenPath, tempDir + "note");

    // The expected data is the reverse of "HELLO" (O L L E H)
    std::vector<uint8_t> expected = {'O','L','L','E','H'}; 
    EXPECT_EQ(mockFileManager->lastWrittenData, expected);
}

// Test 4: Verifies that multiple text arguments are joined by spaces before being compressed.
TEST_F(AddCommandTest, MultiWordText_JoinedAndCompressed) {
    std::vector<std::string> args = {"msg", "this", "is", "a", "test"};
    addCommand->execute(args);

    // The command should combine "this is a test" before compression.
    std::string combined = "this is a test";
    
    // We expect the reverse of the combined string (the Mock's behavior).
    std::vector<uint8_t> expected(combined.rbegin(), combined.rend());
    
    EXPECT_TRUE(mockFileManager->writeCalled);
    EXPECT_EQ(mockFileManager->lastWrittenPath, tempDir + "msg");
    EXPECT_EQ(mockFileManager->lastWrittenData, expected);
}

// Test 5: Verifies that the command exits gracefully if the file already exists.
TEST_F(AddCommandTest, ExistingFile_DoesNothing) {
    mockFileManager->fileExists = true; // Simulate existence check returns true
    std::vector<std::string> args = {"exists.txt", "data"};
    addCommand->execute(args);

    // The core logic of AddCommand should return immediately, skipping the write call.
    EXPECT_FALSE(mockFileManager->writeCalled);
}

// Test 6: Verifies that the command handles the absence of the required environment variable.
TEST_F(AddCommandTest, MissingEnvVar_DoesNothing) {
    unsetenv("OVERDRIVE_PATH"); 
    std::vector<std::string> args = {"file", "data"};
    addCommand->execute(args);

    // If the path cannot be constructed, no operation should be performed.
    EXPECT_FALSE(mockFileManager->writeCalled);
}

// Test 7: A basic safety check to ensure the command doesn't crash if initialized with null pointers.
TEST(AddCommandSafety, NullDependencies_NoCrash) {
    // We test outside the fixture as SetUp would fail on null pointers.
    AddCommand cmd(nullptr, nullptr); 
    std::vector<std::string> args = {"file", "data"};
    // EXPECT_NO_THROW asserts that execution completes without throwing an exception.
    EXPECT_NO_THROW(cmd.execute(args));
}
