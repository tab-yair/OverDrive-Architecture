# OverDrive

OverDrive is a full-stack, distributed file storage system with a C++ storage engine, Node.js API layer, and React client — inspired by Google Drive.

> **Note:** The complete documentation detailing all 4 phases of development has been migrated to the **[OverDrive Wiki](Wiki/Home.md)**!

## Quick Start

### Build & Start All Services
```bash
docker-compose up --build -d
```

### Access Applications
- **Web UI (React)**: http://localhost:3001
- **API Server (Node)**: http://localhost:3000
- **Storage Server (C++)**: Port 5555 (internal bridge network)

### Run C++ Tests
```bash
docker-compose run --rm tests
```

---

*For full details on the REST API, Role-Based Access Control, Custom RLE Compression, and architecture diagrams from Parts 1-4, please refer to the **[Wiki Home](Wiki/Home.md)**.*
