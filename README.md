# OverDrive

A full-stack, distributed file storage system featuring a Node.js Web API layer and a high-performance C++ storage engine with RLE compression.

## Overview

OverDrive is a networked file storage system featuring:
- **Web Server (Node.js)**: Handles user authentication (Gmail-only), permissions, and file metadata.
- **Storage Server (C++)**: A high-performance engine for file persistence, featuring custom RLE compression and multi-threaded searching.
- **Security & Validation**: Strict email validation, password length checks, and owner-only file access.
- **RESTful API**: Clean HTTP interface for managing users and files.
- **Dockerized Microservices**: Seamlessly orchestrated using Docker Compose.

### System Architecture
The system is now split into three main services communicating over a private TCP bridge:
1. Client: Interacts with the system via curl or HTTP requests.
2. Web Server (Port 3000): Manages logic, users, and redirects data to the storage backend.
3. Storage Server (Port 5555): Manages physical file I/O, compression, and content-based search.


## Getting Started

### Prerequisites
- Docker & Docker Compose

### Step 1: Build & Start

```bash
docker-compose up --build -d
```
This command starts both the Web Server and the Storage Server.

### Step 2: Running Tests (Optional)
To verify the system integrity (C++ logic and Protocol):

```bash
docker-compose run --rm tests
```

## API Usage Guide (Interactive Demo)
Follow these steps to explore the system. Replace the placeholders (e.g., <...>) with the actual values returned from your terminal.

### 1. Register a New User
Requirement: Email must be @gmail.com and username part must be 6-30 characters.

```bash
curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"<GMAIL_ADDRESS>\",\"password\":\"<6_OR_MORE_CHARS>\",\"displayName\":\"<YOUR_NAME>\"}"
```
Take note of the Location header in the response to get your USER_ID.

### 2. Create a folder
```bash
curl -X POST http://localhost:3000/api/files \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"<FOLDER_NAME>\",\"type\":\"folder\"}"
```

### 3. Upload a File
You can upload a file to the root or specify a parentId to put it inside a folder.
```bash
curl -X POST http://localhost:3000/api/files \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"<FILENAME>\",\"content\":\"<YOUR_TEXT_HERE>\",\"type\":\"file\",\"parentId\":\"<FOLDER_ID_OR_NULL>\"}"
```

### 4. Search by Name or Content
```bash
curl -X GET "http://localhost:3000/api/files?search=<SEARCH_TERM>" \
     -H "user-id: <USER_ID>"
```

---
## Project Execution Demo: Full User and File Lifecycle

### Phase 1: Identity & Access Management
This phase demonstrates the robustness of the user authentication and validation layer:

1. User Registration: POST /api/users - Creates a new user with strict email validation (minimum 6 characters) and secure password storage. Returns 201 Created.

2. Conflict Handling: POST /api/users - Attempts to register an existing email, proving the system prevents duplicate accounts. Returns 409 Conflict.

3. Secure Authentication: POST /api/tokens - Validates credentials and generates a unique user-id for session management. Returns 200 OK.

![Project Execution Demo](Images/p1_register_users.png)

### Phase 2: Smart Storage & Content Search
This phase showcases the system's core storage capabilities and C++ integration:

File Hierarchy: POST /api/files - Supports creating both folders and files, establishing a structured file system.

RLE Compression: POST /api/files - Transmits data to the C++ storage server where it is compressed using Run-Length Encoding (RLE).

Smart Search: GET /api/files?search=... - Performs a deep-content search. The C++ server decompresses data on-the-fly to find matches within compressed files.

Data Retrieval: GET /api/files/:id - Seamlessly retrieves and decodes the storage, returning the original plain text to the user.

![Project Execution Demo](Images/p2_storge_and_search.png)

### Phase 3: Permissions, Security & Resource Lifecycle
This final phase demonstrates the complete lifecycle of a secure resource and the system's access control logic:

1. Resource Creation: POST /api/files – The owner (Admin) creates a new sensitive file. Returns 201 Created.

2. Unauthorized Access (Blocking): GET /api/files/:id – A Guest user attempts to access the file without permission. Returns 403 Forbidden, validating the security middleware.

3. Role-Based Permission Granting: POST /api/files/:id/permissions – The owner explicitly grants the VIEWER role to the Guest user. Returns 201 Created.

4. Authorized Access (Elevation): GET /api/files/:id – The Guest user attempts to access the file again. Now, with permissions granted, the system returns 200 OK and the decrypted content.

5. Secure Deletion: DELETE /api/files/:id – The owner removes the resource. Returns 204 No Content, confirming the file is purged from both the metadata and storage layers.

![Project Execution Demo](Images/p3_permissions_security_and_resource_lifecycle.png)

---

## API Reference

| Method | Endpoint | Required Headers | Description |
|:---:|:---|:---:|:---|
| `POST` | `/api/users` | - | **Register**: Create a new account (Gmail only, 6+ char password) |
| `POST` | `/api/tokens` | - | **Login**: Authenticate user and retrieve session/token data |
| `POST` | `/api/files` | `user-id` | **Create**: Upload a new file or create a folder |
| `GET` | `/api/files` | `user-id` | **List All**: Retrieve all files and folders owned by the user |
| `GET` | `/api/files/:id` | `user-id` | **Fetch**: Get full metadata and content of a specific resource |
| `GET` | `/api/files?search=...` | `user-id` | **Search**: Global search by name (Metadata) or content (C++ Scan) |
| `DELETE` | `/api/files/:id` | `user-id` | **Delete**: Remove a file or folder (includes recursive deletion) |

---

### Status Codes
- `200 Ok` - Success.
- `201 Created` - Resource created successfully.
- `400 Bad Request` - Validation failed (e.g., non-Gmail address).
- `401 Unauthorized` - Missing or invalid user-id.
- `404 Not Found` - Resource or Owner does not exist.

---

## Architecture

The system follows SOLID principles with a strict separation of concerns between the user-facing API and the performance-critical storage backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Client                           │
│                   (Browser / cURL / Postman)                │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/JSON (port 3000)
┌─────────────────────────▼───────────────────────────────────┐
│                   Web Server (Node.js/Express)              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Permission  │─▶│ File/Folder  │─▶│   Storage Client   │  │
│  │    Store    │  │  Controller  │  │   (TCP Wrapper)    │  │
│  └─────────────┘  └──────────────┘  └─────────┬──────────┘  │
└───────────────────────────────────────────────│─────────────┘
                          │ TCP Socket (port 5555)
┌─────────────────────────▼───────────────────────────────────┐
│                  Storage Server (C++17)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Parser    │─▶│   Executor   │─▶│  RLE Compression   │  │
│  └─────────────┘  └──────────────┘  └─────────┬──────────┘  │
│  ┌────────────────────────────────────────────▼──────────┐  │
│  │                 File Management Layer                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────────┐  │  │
│  │  │Thread-Safe │─▶│  Hashing   │─▶│  Local Storage  │  │  │
│  │  └────────────┘  └────────────┘  └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
OverDrive/
├── web-server/                # Node.js API Layer (Microservice)
│   ├── server.js              # Entry point & Express configuration
│   ├── controllers/           # Route logic (User, File, Search)
│   ├── routes/                # REST API endpoint definitions
│   ├── models/                # Data structures & In-memory stores
│   ├── services/              # Business logic & TCP Storage Client
│   └── middleware/            # Auth & Error handling
├── storage-server/            # C++ Storage Engine (Microservice)
│   ├── src/
│   │   ├── commands/          # POST, GET, DELETE, SEARCH implementations
│   │   ├── communication/     # TCP Socket handling
│   │   ├── file/              # RLE Compression & File management
│   │   ├── server/            # Main server loop (server_main.cpp)
│   │   └── threading/         # ThreadPool & Thread management
│   └── tests/                 # C++ Unit tests (GTest)
├── Client/                    # Legacy C++/Python clients
├── Common/                    # Shared interfaces & Protocol definitions
├── docker-compose.yml         # Multi-container orchestration
└── CMakeLists.txt             # C++ Build configuration
```

---


## Search Logic
The system implements a fallback search mechanism:
1. Metadata Search: The Web Server first checks if any file/folder name matches the query.
2. Content Search: If no match is found, the request is delegated to the C++ Storage Server, which performs a deep scan of compressed file contents using the SEARCH protocol command. 

## Known Limitations

- Gmail Restriction: Only @gmail.com addresses are allowed for registration.
- In-Memory Users: User data resets on Web Server restart (unless persistent store is attached).
- Search Case-Sensitivity: Search is currently case-sensitive.

---

## License

This project is part of an academic exercise in Advanced Systems Programming.
