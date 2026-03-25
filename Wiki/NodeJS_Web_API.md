# OverDrive: Part 3 - Node.js Web API layer

A full-stack, distributed file storage system featuring a Node.js Web API layer and a high-performance C++ storage engine with RLE compression.                 

## Overview

OverDrive is a networked file storage system featuring:
- **Web Server (Node.js)**: Handles user authentication (Gmail-only), permissions, and file metadata.                                                           
- **Storage Server (C++)**: A high-performance engine for file persistence, featuring custom RLE compression and multi-threaded searching.                      
- **Security & Validation**: Strict email validation, password length checks, and owner-only file access.                                                       
- **RESTful API**: Clean HTTP interface for managing users and files.
- **Dockerized Microservices**: Seamlessly orchestrated using Docker Compose.

### System Architecture
The system is split into three main services communicating over a private TCP bridge:                                                                       
1. Client: Interacts with the system via curl or HTTP requests.
2. Web Server (Port 3000): Manages logic, users, and redirects data to the storage backend.                                                                     
3. Storage Server (Port 5555): Manages physical file I/O, compression, and content-based search.                                                                

## Getting Started

### Step 1: Build & Start
```bash
docker-compose up --build -d
```
This command starts both the Web Server and the Storage Server.

### Step 2: Running Tests
To verify the system integrity (C++ logic and Protocol):
```bash
docker-compose run --rm tests
```

---

## Architecture Flow

The system follows SOLID principles with a strict separation of concerns between the user-facing API and the performance-critical storage backend.              
```text
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

## API Usage Guide (Interactive Demo)

Follow these steps to explore the system. Replace `<...>` values with actual IDs returned from the server.                                                        

### 1. Identity & Access
**1.1 Register User**
```bash
curl -i -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"username":"<GMAIL_ADDRESS>","password":"<PASSWORD>","firstName":"<FIRST_NAME>","lastName":"<LAST_NAME>"}'                            
```
*Expected Response: 201 Created. Header Location contains the USER_ID.*

**1.2 User Login**
```bash
curl -i -X POST http://localhost:3000/api/tokens \
     -H "Content-Type: application/json" \
     -d '{"username":"<GMAIL_ADDRESS>","password":"<PASSWORD>"}'
```
*Expected Response: 200 OK. Body: {"user-id": "..."}.*

**1.3 Get User Profile**
```bash
curl -i -X GET http://localhost:3000/api/users/<USER_ID> \
     -H "user-id: <USER_ID>"
```

### 2. File & Folder Management
**2.1 Create Folder**
```bash
curl -i -X POST http://localhost:3000/api/files \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Work_Project","type":"folder"}'
```

**2.2 Upload File (with RLE Compression)**
```bash
curl -i -X POST http://localhost:3000/api/files \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"name":"notes.txt","content":"AAAAABBBBB","type":"file","parentId":"<FOLDER_ID_OR_NULL>"}'                                            
```
*Expected Response: 201 Created. Data is automatically compressed in the C++ backend.*                                                                            

**2.3 List All Files (Tree Root)**
```bash
curl -i -X GET http://localhost:3000/api/files \
     -H "user-id: <USER_ID>"
```

**2.4 Get File Metadata & Content**
```bash
curl -i -X GET http://localhost:3000/api/files/<FILE_ID> \
     -H "user-id: <USER_ID>"
```

**2.5 Update File/Folder (Name, Content, or Location)**
```bash
# Update name
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID> \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"name":"new_filename.txt"}'

# Move to different parent folder
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID> \
     -H "user-id: <USER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"parentId":"<NEW_FOLDER_ID>"}'
```

**2.6 Delete File/Folder**
```bash
curl -i -X DELETE http://localhost:3000/api/files/<FILE_ID> \
     -H "user-id: <USER_ID>"
```

### 3. Advanced Features
**3.1 Smart Search (Name & Content)**
```bash
curl -i -X GET http://localhost:3000/api/search/<TERM> \
     -H "user-id: <USER_ID>"
```

**3.2 Get Permissions**
```bash
curl -i -X GET http://localhost:3000/api/files/<FILE_ID>/permissions \
     -H "user-id: <USER_ID>"
```

**3.3 Grant Permission (RBAC)**
```bash
curl -i -X POST http://localhost:3000/api/files/<FILE_ID>/permissions \
     -H "user-id: <OWNER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"targetUserId":"<GUEST_ID>","permissionLevel":"VIEWER"}'
```

---

## Project Execution Demo: Complete API Walkthrough

This section provides a visual, step-by-step demonstration of the entire OverDrive system lifecycle, from user registration to collaborative file management with permissions.                                                                  

### 1. User Registration & Conflict Handling
**POST /api/users** - Creating users Alicia and Robert with Gmail validation (6-30 character usernames). The system enforces duplicate prevention, returning **409 Conflict** when attempting to register an existing email.                    
![User Registration](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/1.png)

### 2. Authentication & Profile Retrieval
**POST /api/tokens** - Users authenticate and receive a unique `user-id` for session management. **GET /api/users/:id** - Verifying that user data (username, firstName, lastName) is correctly stored and retrieved.                           
![Authentication](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/2.png)

### 3. File Hierarchy Creation
**POST /api/files** - Alicia creates a folder named "Work_Project" and then uploads a file "notes.txt" inside it using `parentId` to establish the hierarchy.   
![Folder and File Creation](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/3.png)

### 4. Root-Level Files & Listing
**POST /api/files** - Alicia creates "readme.txt" at the root level (no parent).
**GET /api/files** - Listing all files and folders to verify the current structure.                                                                            
![File Listing](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/4.png)

### 5. File Updates - Name & Content
**PATCH /api/files/:id** - Alicia renames "notes.txt" to "important_notes.txt" and then updates its content to text starting with "ZZZZZZZZZ". Both operations return **204 No Content**.                                                       
![File Updates](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/5.png)

### 6. File Movement & Search Initialization
**PATCH /api/files/:id** - Moving "important_notes.txt" from "Work_Project" to root by setting `parentId` to `null`. Introduction to **GET /api/search/:query** for content-based searching.                                                    
![File Movement](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/6.png)

### 7. Deep Content Search in Compressed Data
**GET /api/search/:query** - Demonstrating full-text search capabilities. Searching for "ZZZZZ" finds the file with that content, and searching "OverDrive" locates the readme file. The C++ backend performs decompression on-the-fly for content matching.                                                                    
![Content Search](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/7.png)

### 8. Access Control & Permission Granting
**GET /api/files/:id** - Robert attempts to access Alicia's file and receives **403 Forbidden**. **GET /api/files/:id/permissions** - Alicia checks current permissions. **POST /api/files/:id/permissions** - Alicia grants Robert **VIEWER** access (**201 Created**).                                                        
![Access Control](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/8.png)

### 9. Authorized Access & Permission Upgrade
**GET /api/files/:id** - Robert successfully reads the file content with his VIEWER permission. **PATCH /api/files/:id/permissions/:pId** - Alicia upgrades Robert from **VIEWER** to **EDITOR** (**204 No Content**).                          
![Permission Upgrade](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/9.png)

### 10. Collaborative Editing & Final State
**PATCH /api/files/:id** - Robert (now an EDITOR) modifies the file content to "Guest modified this content". **GET /api/files/:id/permissions** - Final verification shows Alicia as **OWNER** and Robert as **EDITOR**, demonstrating full RBAC functionality.                                                                
![Collaborative Editing](https://raw.githubusercontent.com/tab-yair/OverDrive-Architecture/main/Images/10.png)

---

## Dual Search Mechanism

The system performs a dual search on both file names and content, with filtering:                                                                            
1. **Metadata Search** – The Web Server searches for files and folders by name, limited to those the user has access to.                                            
2. **Content Search** – Requests for content search are sent to the C++ Storage Server. Since the server may return IDs of irrelevant files (due to its internal ID system), results are filtered to include only files the user can access. An additional check is performed on the file content to confirm a real match, and any non-matching files are discarded.                                                

## Known Limitations
- **Gmail Restriction**: Only @gmail.com addresses are allowed for registration (usernames 6-30 characters).
- **In-Memory Users**: User data resets on Web Server restart (unless persistent store is attached).
- **Search Case-Sensitivity**: Search is currently case-sensitive.