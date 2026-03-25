# OverDrive Wiki Home

Welcome to the **OverDrive** Wiki!

OverDrive is a full-stack, distributed file storage system inspired by Google Drive, built progressively over four developmental phases as part of an Advanced Systems Programming architecture project.

This Wiki preserves the complete documentation, design decisions, and system overviews across all four iterations of the project.

## Development Phases

### [Phase 1: CLI Foundation & Core Engine](Part1_CLI_Foundation.md)
The inception of the core C++17 engine. This phase introduced the core compression layer utilizing Custom Run-Length Encoding (RLE), Local File Management, and the `add`, `get`, and `search` command paradigms interacting natively in a console terminal.

### [Phase 2: TCP Client-Server Architecture](Part2_TCP_Storage_Server.md)
Evolution of the core engine into a Multi-threaded TCP Server. This phase introduced the `Command Pattern`, network decoupling, hashing file mappers (SHA256) for thread-safe concurrent storage operations, and support for dual client connections (C++ and Python).

### [Phase 3: Node.js Web API layer](Part3_NodeJS_Web_API.md)
The transformation into a true microservice distributed backend. This stage wrapped the raw C++ engines with an Express.js API, injecting Google-based JWT Authentication, Role-Based Access Control (VIEWER, EDITOR, OWNER), virtual paths mapping, and the complex "Dual Search" integration.

### [Phase 4: React Full-Stack UI](Part4_React_Full_Stack.md)
The final milestone providing the complete User Experience via a React 19 SPA (Single Page Application). Introducing a Google Drive-like interface, Dark/Light theming, Trash lifecycle mappings, storage capacities checking, and advanced visual integrations bridging the backend infrastructure with users.

---

Choose any phase above to read the original extensive documentations, complete with visual mappings and usage walkthroughs.