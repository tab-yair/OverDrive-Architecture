# OverDrive: Part 2 - TCP Client-Server Architecture

A high-performance client-server file storage system with RLE compression, built with C++17 and Python.                                                         

## Overview

OverDrive is a networked file storage system featuring:
- **Client-Server Architecture**: Multi-threaded server handling multiple concurrent clients                                                                    
- **RLE Compression**: Automatic Run-Length Encoding for efficient storage
- **Dual Client Support**: Both C++ and Python client implementations
- **HTTP-like Protocol**: Simple text-based protocol with status codes
- **Persistent Storage**: Files and metadata persist across server restarts
- **Docker-Ready**: Full containerization with Docker Compose

---

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Step 1: Build (one-time only)
```bash
docker-compose build
```

### Step 2: Start the Server
```bash
docker-compose up -d server
```

### Step 3: Run a Client

**Python client:**
```bash
docker-compose --profile client run --rm -it client-python
```

**C++ client:**
```bash
docker-compose --profile client run --rm -it client-cpp
```

### Step 4: Stop Everything
```bash
docker-compose down
```

---

## Demo: Multiple Clients

The screenshot below demonstrates multiple terminal windows running simultaneously — one server and multiple clients connected at the same time:                

![Multiple Terminals Demo](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/running_example_proof.jpg)

---

## Protocol Commands

| Command | Description | Example | Response |
|---------|-------------|---------|----------|
| `POST <filename> <content>` | Create a new file | `POST myfile.txt Hello World` | `201 Created` |
| `GET <filename>` | Retrieve file content | `GET myfile.txt` | `200 Ok` + content |
| `DELETE <filename>` | Remove a file | `DELETE myfile.txt` | `200 Ok` |
| `SEARCH <keyword>` | Search files by content | `SEARCH Hello` | `200 Ok` + matching filenames |

### Status Codes
- `200 Ok` — Success
- `201 Created` — File created successfully
- `400 Bad Request` — Invalid command syntax
- `404 Not Found` — File does not exist

---

## Architecture

The system follows SOLID principles with clean separation of concerns:

```text
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
│              (C++ Client / Python Client)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ TCP Socket (port 5555)
┌─────────────────────────▼───────────────────────────────────┐
│                         Server                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   Parser    │─▶│   Executor   │─▶│     Commands      │   │
│  └─────────────┘  └──────────────┘  │ POST/GET/DELETE/  │   │
│                                     │     SEARCH        │   │
│                                     └─────────┬─────────┘   │
│  ┌─────────────────────────────────────────────▼─────────┐  │
│  │              File Management Layer                    │  │
│  │  ┌─────────────┐  ┌────────────┐  ┌───────────────┐   │  │
│  │  │ Thread-Safe │─▶│ Compressed │─▶│ Local Storage │   │  │
│  │  │  Wrapper    │  │  Storage   │  │               │   │  │
│  │  └─────────────┘  └────────────┘  └───────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components
- **Commands**: `PostCommand`, `GetCommand`, `DeleteCommand`, `SearchCommand` (all implement `ICommand`)                                                        
- **Storage**: Layered architecture with thread-safety, compression, and raw I/O
- **Metadata**: `JsonMetadataStore` with immediate persistence
- **Path Mapping**: `HashPathMapper` using SHA256 for physical paths
- **Compression**: `RLECompressor` implementing `ICompressor`
- **Communication**: `ICommunication` interface for socket/console abstraction

---

## Architecture Q&A Constraints

### 1. Did renaming commands require modifying code that should be "closed to modification"?                                                                    
**No.** The only changes required were in the command registration dictionary and the corresponding imports. The dictionary acts as a configuration layer that maps command names to their implementations — it is designed to be the single point of modification for such changes. The core logic (command execution, parsing, etc.) remained untouched. This is the expected behavior: the mapping/registration code is inherently "open" to accommodate new or renamed commands, while the actual business logic stays closed.

### 2. Did adding new commands require modifying code that should be "closed to modification"?                                                                  
**No.** We implemented the Command Pattern with each command as a separate class implementing a common interface (`ICommand`). Adding a new command only required creating a new class and registering it in the command dictionary — no existing command or core logic code was modified.                       

### 3. Did changing command output format require modifying code that should be "closed to modification"?                                                       
**Yes**, initially. We had to modify existing code to accommodate output changes. To prevent this in the future, we implemented a `CommandResult` struct that encapsulates the output in a flexible way, allowing different data types and formats to be returned without changing the command interface or the code that processes results.                                                                    

### 4. Did switching from console to socket I/O require modifying code that should be "closed to modification"?                                                 
**No.** We implemented the Dependency Inversion Principle by creating an `ICommunication` interface. The core logic depends only on this abstraction. To support sockets, we simply created a new `SocketCommunication` class implementing the interface — no existing code was modified.                        

---

## Running Tests

```bash
docker-compose run --rm tests
```

Expected output: `100% tests passed, 0 tests failed out of X`

### Test Coverage
- Hash Path Mapper
- Local File Storage
- Compressed File Storage
- JSON Metadata Store
- RLE Compressor
- Local File Management 
- Thread-Safe File Management
- Command Parsing & Executor
- POST/GET/DELETE/SEARCH Commands
- Client-Server Communication

---

## Project Structure

```text
OverDrive/
├── Server/
│   └── src/
│       ├── server/          # Server entry point
│       ├── commands/        # POST, GET, DELETE, SEARCH
│       ├── communication/   # Socket communication
│       ├── compressor/      # RLE compression
│       ├── executors/       # Command execution
│       ├── file/            # Storage, metadata, path mapping
│       ├── handlers/        # Client connection handlers
│       ├── parsers/         # Command parsing
│       └── threading/       # Thread management
├── Client/
│   └── src/
│       └── Client/          # C++ and Python clients
├── Common/
│   └── include/             # Shared interfaces and protocols
├── docker-compose.yml
├── Dockerfile.server
├── Dockerfile.client
├── Dockerfile.client-python
└── Dockerfile.tests
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Languages | C++17, Python 3.11 |
| Build | CMake 3.14+ |
| Testing | GoogleTest 1.14.0 |
| Containers | Docker & Docker Compose |
| Compiler | GCC 11 |
| Libraries | OpenSSL, nlohmann/json, C++ STL |

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `OVERDRIVE_PATH` | `/app/files` | Server storage directory |
| Port | `5555` | TCP listening port |
| Volume | `./server_data:/app/files` | Persistent storage mount |

---

## Known Limitations

- File names cannot contain spaces (use underscores)
- Search is case-sensitive
- No authentication (single-user system)
- RLE compression is ineffective for random data