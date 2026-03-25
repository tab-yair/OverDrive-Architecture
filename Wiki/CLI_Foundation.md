# OverDrive: Part 1 - CLI Foundation

A CLI-based file compression system using Run-Length Encoding (RLE) compression,
 built with C++17.                                                              

## Overview

OverDrive is a command-line interface application that manages compressed files 
using RLE (Run-Length Encoding). The system stores compressed files in a designated directory and provides commands to add, retrieve, and search through compressed content.                                                                    

## Features

- **File Compression**: Automatic RLE compression when storing files
- **File Retrieval**: Decompress and retrieve file content on demand
- **Content Search**: Search across all stored files for specific text
- **Robust Error Handling**: Gracefully handles invalid commands and edge cases
- **Comprehensive Testing**: Unit and integration tests with GoogleTest

## Commands

The application supports three main commands:

### `add [file name] [text]`
Creates a new compressed file with the given name and content.
- **Parameters**:
  - `file name`: Name of the file to create (no spaces allowed)
  - `text`: Content to compress and store (optional, defaults to empty)
- **Behavior**: 
  - Compresses the text using RLE
  - Stores in the directory specified by `OVERDRIVE_PATH` environment variable
  - No output on success
  - Fails silently if file already exists

### `get [file name]`
Retrieves and decompresses the content of a stored file.
- **Parameters**:
  - `file name`: Name of the file to retrieve
- **Output**: The decompressed file content
- **Behavior**: 
  - Returns decompressed text on success
  - No output if file doesn't exist

### `search [text]`
Searches for files containing the specified text.
- **Parameters**:
  - `text`: Text to search for in file contents
- **Output**: Space-separated list of filenames containing the text
- **Behavior**: 
  - Searches through all stored files
  - Returns matching filenames
  - No output if no matches found

### Error Handling
- Invalid commands are ignored silently (no output)
- Malformed commands are ignored silently (no output)
- The application continues running and accepting new commands
- No error messages or prompts are displayed

## Architecture

The project follows SOLID principles with a modular architecture:

- **Commands**: `AddCommand`, `GetCommand`, `SearchCommand` (implementing `ICommand`)
- **File Management**: `LocalFileManagement` (implementing `IFileManagement`)
- **Compression**: `RLECompressor` (implementing `ICompressor`)
- **Parsing**: `CommandParser` (implementing `IParser`)
- **Execution**: `CommandExecutor` (implementing `IExecutor`)
- **UI**: `ConsoleMenu` (implementing `IMenu`)

## Technology Stack

- **Language**: C++17
- **Build System**: CMake 3.14+
- **Testing Framework**: GoogleTest 1.12.1
- **Containerization**: Docker & Docker Compose
- **Compiler**: GCC (latest)

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Build
```bash
docker compose build
```

### Run Tests
```bash
docker compose run --rm tests
```

### Run Application
```bash
docker compose run --rm app
```

The application will start an interactive CLI session. Enter commands and press 
Enter. The application runs indefinitely until you stop it (Ctrl+C).            

### Example Usage
```text
add file1 HelloWorld
get file1
HelloWorld
add file2 AAAABBBCCC
search AAA
file2
add file3 Testing
search Test
file3
get file1
HelloWorld
```

## Environment Variables
- `OVERDRIVE_PATH`: Directory path where compressed files are stored (default: `/app/files`)                                                                    

## Project Structure
```text
OverDrive/
├── src/
│   ├── main.cpp                    # Application entry point
│   ├── app/                        # Application core
│   ├── commands/                   # Command implementations
│   ├── compressor/                 # RLE compression logic
│   ├── executors/                  # Command execution
│   ├── file/                       # File management
│   ├── menus/                      # CLI interface
│   └── parsers/                    # Command parsing
├── tests/                          # Unit and integration tests
│   └── mocks/                      # Mock objects for testing
├── CMakeLists.txt                  # Build configuration
├── Dockerfile                      # Production container
├── Dockerfile.tests                # Test container
└── docker-compose.yml              # Multi-container orchestration
```

## Development

### Local Build (requires CMake and GCC)
```bash
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -- -j$(nproc)
```

### Run Tests Locally
```bash
cd build
ctest --output-on-failure
```

## Testing

The project includes comprehensive test coverage:
- **Unit Tests**: Individual component testing with mocks
- **Integration Tests**: End-to-end workflow validation
- **Coverage Areas**:
  - Command parsing and execution
  - RLE compression/decompression
  - File management operations
  - Error handling and edge cases

## License

This project is part of an academic exercise in Advanced Systems Programming.