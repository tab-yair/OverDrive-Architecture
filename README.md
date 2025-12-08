# OverDrive

A high-performance client-server file storage system with RLE compression, built with C++17 and Python.

## Overview

OverDrive is a networked file storage system featuring:
- **Client-Server Architecture**: Multi-threaded server handling multiple concurrent clients
- **RLE Compression**: Automatic Run-Length Encoding compression for efficient storage
- **Dual Client Support**: Both C++ and Python client implementations
- **HTTP-like Protocol**: Simple text-based protocol with status codes (200, 201, 404, 400)
- **Persistent Storage**: Metadata and files persist across server restarts
- **Docker-Ready**: Full containerization with Docker Compose

## Features

- ✅ **Multi-threaded Server**: Handles multiple concurrent client connections
- ✅ **RLE Compression**: Automatic compression/decompression of file content
- ✅ **Persistent Storage**: Files and metadata survive server restarts
- ✅ **Dual Clients**: C++ and Python client implementations
- ✅ **HTTP-like Protocol**: Status codes (200 OK, 201 Created, 404 Not Found, 400 Bad Request)
- ✅ **Docker Support**: Complete containerization with docker-compose
- ✅ **Comprehensive Testing**: 14 unit tests with GoogleTest (100% pass rate)
- ✅ **Thread-Safe**: Concurrent file operations with proper locking

## Protocol Commands

The system supports four main commands using an HTTP-like protocol:

### `POST <filename> <content>`
Creates a new file with the given name and content.
- **Example**: `POST myfile.txt Hello World`
- **Response**: `201 Created`
- **Behavior**: 
  - Compresses content using RLE before storage
  - Files stored with hash-based physical paths
  - Returns `400 Bad Request` if filename missing

### `GET <filename>`
Retrieves and decompresses file content.
- **Example**: `GET myfile.txt`
- **Response**: 
  ```
  200 Ok
  Hello World
  ```
- **Behavior**: 
  - Decompresses content automatically
  - Returns `404 Not Found` if file doesn't exist
  - Updates last access timestamp

### `DELETE <filename>`
Removes a file from storage.
- **Example**: `DELETE myfile.txt`
- **Response**: `200 Ok`
- **Behavior**: 
  - Removes both compressed file and metadata
  - Returns `404 Not Found` if file doesn't exist

### `SEARCH <keyword>`
Searches for files containing the keyword.
- **Example**: `SEARCH Hello`
- **Response**: 
  ```
  200 Ok
  myfile.txt otherfile.txt
  ```
- **Behavior**: 
  - Searches decompressed content
  - Returns space-separated list of matching filenames
  - Case-sensitive search

## Architecture

The system follows SOLID principles with clean separation of concerns:

### Server Components
- **Commands**: `PostCommand`, `GetCommand`, `DeleteCommand`, `SearchCommand` (implementing `ICommand`)
- **File Management**: `LocalFileManagement` with thread-safe operations
- **Storage Layers**:
  - `LocalFileStorage`: Raw file I/O
  - `CompressedFileStorage`: RLE compression wrapper
  - `ThreadSafeFileManagement`: Concurrent access protection
- **Metadata**: `JsonMetadataStore` with immediate persistence
- **Path Mapping**: `HashPathMapper` using SHA256 for physical paths
- **Compression**: `RLECompressor` (implementing `ICompressor`)
- **Parsing**: `CommandParser` with case-insensitive command names
- **Execution**: `CommandExecutor` coordinating command lifecycle
- **Networking**: `ClientServerComm` with line-based protocol
- **Threading**: `DedicatedThreadManager` for client handlers

### Client Components
- **C++ Client**: Fast native client with `ClientServerComm` networking
- **Python Client**: Portable client with socket-based communication
- **User I/O**: `UserClientComm` for stdin/stdout interaction

## Technology Stack

- **Languages**: C++17, Python 3.11
- **Build System**: CMake 3.14+
- **Testing Framework**: GoogleTest 1.14.0
- **Containerization**: Docker & Docker Compose
- **Compiler**: GCC 11
- **Libraries**: 
  - OpenSSL (SHA256 hashing)
  - nlohmann/json (metadata serialization)
  - C++ STL (threading, filesystem, networking)

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### 1. Build All Services

```bash
docker-compose build
```

This builds three images:
- `overdrive-server`: The file storage server
- `overdrive-client`: C++ client (1.77GB)
- `overdrive-client-python`: Python client (186MB)
- `overdrive-tests`: Test suite (1.94GB)

### 2. Run Tests

```bash
docker-compose run --rm tests
```

Expected output: `100% tests passed, 0 tests failed out of 14`

### 3. Start Server

```bash
docker-compose up -d server
```

Server starts on `localhost:5555` with health checks enabled.

### 4. Use Clients

#### Python Client (Recommended for Interactive Use)
```bash
echo "POST myfile.txt Hello World" | docker-compose run --rm --no-TTY client-python
echo "GET myfile.txt" | docker-compose run --rm --no-TTY client-python
echo "SEARCH Hello" | docker-compose run --rm --no-TTY client-python
echo "DELETE myfile.txt" | docker-compose run --rm --no-TTY client-python
```

#### C++ Client
```bash
echo "POST file.txt content" | docker-compose run --rm --no-TTY client-cpp
echo "GET file.txt" | docker-compose run --rm --no-TTY client-cpp
```

#### Direct TCP Connection (Testing)
```bash
nc localhost 5555
POST test.txt Hello
201 Created
GET test.txt
200 Ok
Hello
```

### Example Session

```bash
# Start server
docker-compose up -d server

# Create files
echo "POST document.txt Important data" | docker-compose run --rm --no-TTY client-python
# Output: 201 Created

echo "POST notes.txt Remember this" | docker-compose run --rm --no-TTY client-python
# Output: 201 Created

# Retrieve file
echo "GET document.txt" | docker-compose run --rm --no-TTY client-python
# Output:
# 200 Ok
# Important data

# Search files
echo "SEARCH data" | docker-compose run --rm --no-TTY client-python
# Output:
# 200 Ok
# document.txt

# Delete file
echo "DELETE notes.txt" | docker-compose run --rm --no-TTY client-python
# Output: 200 Ok

# Stop server
docker-compose down
```

## Configuration

### Environment Variables
- `OVERDRIVE_PATH`: Server storage directory (default: `/app/files`)

### Docker Volumes
- `./server_data:/app/files`: Persistent file and metadata storage

### Ports
- `5555`: Server listening port (TCP)

## Project Structure

```
OverDrive/
├── Server/
│   ├── src/
│   │   ├── server/
│   │   │   └── server_main.cpp          # Server entry point
│   │   ├── commands/                    # POST, GET, DELETE, SEARCH
│   │   ├── communication/               # Socket communication
│   │   ├── compressor/                  # RLE compression
│   │   ├── executors/                   # Command execution
│   │   ├── file/
│   │   │   ├── management/              # File operations
│   │   │   ├── metadata/                # JSON metadata store
│   │   │   ├── path/                    # SHA256 path mapper
│   │   │   └── storage/                 # Storage layers
│   │   ├── handlers/                    # Client connection handlers
│   │   ├── parsers/                     # Command parsing
│   │   └── threading/                   # Thread management
│   └── tests/                           # Unit tests (14 total)
│       └── mocks/                       # Mock objects
├── Client/
│   └── src/
│       ├── Client/
│       │   ├── Client.cpp               # C++ client
│       │   └── Client.py                # Python client
│       └── communication/               # User and server comm
├── Common/
│   └── include/
│       ├── communication/               # Shared communication
│       └── protocol/                    # Command result format
├── CMakeLists.txt                       # Build configuration
├── Dockerfile.server                    # Server container
├── Dockerfile.client                    # C++ client container
├── Dockerfile.client-python             # Python client container
├── Dockerfile.tests                     # Test container
└── docker-compose.yml                   # Multi-service orchestration
```

## Testing

The project includes 14 comprehensive unit tests (100% pass rate):

### Test Suites
1. **Hash Path Mapper** (3 tests): SHA256 path generation and resolution
2. **Local File Storage** (3 tests): Raw file I/O operations
3. **Compressed File Storage** (3 tests): RLE compression integration
4. **JSON Metadata Store** (5 tests): Persistence and retrieval
5. **RLE Compressor** (19 tests): Compression/decompression edge cases
6. **Local File Management** (9 tests): High-level file operations
7. **Thread-Safe File Management** (1 test): Concurrent access
8. **Command Parsing** (35 tests): Command syntax validation
9. **Command Executor** (11 tests): Command routing and execution
10. **POST Command** (6 tests): File creation logic
11. **GET Command** (6 tests): File retrieval logic
12. **DELETE Command** (6 tests): File deletion logic
13. **SEARCH Command** (7 tests): Content search logic
14. **Client-Server Communication** (10 tests): Network protocol

### Running Tests

```bash
# Docker (recommended)
docker-compose run --rm tests

# Local build
mkdir build && cd build
cmake .. && make
ctest --output-on-failure
```

## Development

### Local Build (requires CMake 3.14+, GCC 11, OpenSSL, nlohmann-json)

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y cmake g++ libssl-dev nlohmann-json3-dev

# Build
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -- -j$(nproc)

# Run server
./server_main 5555

# Run client (separate terminal)
./client_main localhost 5555
```

### Debugging

```bash
# Server logs
docker-compose logs server

# Server with live logs
docker-compose up server

# Interactive server shell
docker-compose exec server /bin/bash
```

## Performance Characteristics

- **Compression Ratio**: Depends on content (best for repeated characters)
- **Concurrency**: Handles multiple clients simultaneously
- **Persistence**: Immediate metadata writes (no 3-minute delay)
- **Thread Safety**: Full concurrent read/write support with shared mutexes
- **Network**: Line-based protocol with newline delimiters

## Known Limitations

- File names cannot contain spaces (use underscores instead)
- Search is case-sensitive
- No authentication/authorization (single-user system)
- RLE compression ineffective for random data
- No file versioning or history

## Future Enhancements

- [ ] User authentication and multi-tenancy
- [ ] File versioning and history
- [ ] Advanced compression algorithms (LZ77, Huffman)
- [ ] RESTful HTTP API
- [ ] Web-based UI
- [ ] Distributed storage across multiple nodes
- [ ] Encryption at rest and in transit

## Contributing

This is an academic project. For questions or issues, please contact the project maintainer.

## License

This project is part of an academic exercise in Advanced Systems Programming.