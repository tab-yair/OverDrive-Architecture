# OverDrive

A full-stack, distributed file storage system featuring a Node.js Web API layer and a high-performance C++ storage engine with RLE compression.

## Overview

OverDrive is a networked file storage system featuring:
- **Web Server (Node.js)**: Handles JWT-based authentication (Gmail-only), permissions, and file metadata.
- **Storage Server (C++)**: A high-performance engine for file persistence, featuring custom RLE compression and multi-threaded searching.
- **Security & Validation**: JWT token authentication, strict email validation, strong password requirements (8+ characters with both letters and numbers), and owner-only file access.
- **RESTful API**: Clean HTTP interface for managing users and files.
- **User Features**: Starred files and recently accessed file tracking with automatic interaction recording.
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

## API Reference

### Authentication
All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints

| Method | Endpoint | Auth Required | Description |
|:---:|:---|:---:|:---|
| `POST` | `/api/users` | ❌ | **Register**: Create a new account (Gmail only, password: 8+ chars with letters and numbers). Fields: `username`, `password`, `firstName`, `profileImage` (required Base64 image), `lastName` (optional, defaults to `null`). **Automatically creates default preferences** (theme: light, landingPage: home) |
| `GET` | `/api/users/:id` | ✅ | **Get User Profile**: Retrieve user details. **Owner**: Returns full profile (id, username, firstName, lastName, profileImage, storageUsed, createdAt, modifiedAt). **Non-owner**: Returns limited public profile (id, firstName, lastName, username, profileImage) |
| `PATCH` | `/api/users/:id` | ✅ | **Update User Profile**: Update user details. Allowed fields: `password`, `firstName`, `lastName`, `profileImage`. Username cannot be changed. Set `lastName` or `profileImage` to `null` to remove them |
| `GET` | `/api/users/:id/preference` | ✅ | **Get User Preferences**: Retrieve user's preferences (`theme`, `landingPage`). User can only access their own preferences |
| `PATCH` | `/api/users/:id/preference` | ✅ | **Update User Preferences**: Update preferences. Allowed fields: `theme` (light/dark), `landingPage` (home/storage). Partial updates supported |
| `POST` | `/api/tokens` | ❌ | **Login**: Authenticate user and retrieve JWT token. Returns: `{ token: "<JWT>" }` |
| `GET` | `/api/storage` | ✅ | **Get Storage Info**: Retrieve current storage usage and limit for authenticated user. Returns: `{ storageUsed, storageLimit, storageAvailable, storageUsedMB, storageLimitMB, storageAvailableMB, usagePercentage }` |
| `POST` | `/api/files` | ✅ | **Create**: Upload a new file or create a folder |
| `GET` | `/api/files` | ✅ | **List All**: Retrieve all files and folders at root level (/) with user as Viewer|
| `GET` | `/api/files/starred` | ✅ | **Get Starred Files**: Retrieve all files starred by the current user with metadata (`isStarred`, `lastViewedAt`, `lastEditedAt`) |
| `GET` | `/api/files/recent` | ✅ | **Get Recent Files**: Retrieve recently accessed files (docs, pdf, image only - folders excluded), sorted by most recent interaction first. Includes `lastInteractionType` (VIEW/EDIT) |
| `GET` | `/api/files/shared` | ✅ | **List Shared With Me**: Retrieve all files/folders where the user has **direct** VIEWER or EDITOR permissions (not inherited), and is NOT the owner. Includes `sharedPermissionLevel` |
| `GET` | `/api/files/:id` | ✅ | **Fetch**: Get full metadata and content of a specific file/folder. Automatically records VIEW interaction |
| `GET` | `/api/files/:id/download` | ✅ | **Download**: Polymorphic download endpoint. For single files (docs, pdf, image): returns decoded binary with proper Content-Type headers. For folders: returns flattened JSON array of all files recursively with uncompressed content and relative paths |
| `PATCH` | `/api/files/:id` | ✅ | **Update**: Update file/folder name or content or location. Automatically records EDIT interaction |
| `POST` | `/api/files/:id/star` | ✅ | **Toggle Star**: Star or unstar a file. Returns `{ fileId, isStarred }` |
| `POST` | `/api/files/:id/copy` | ✅ | **Copy**: Create a duplicate of a file/folder. The requester becomes the OWNER of the new copy. Body (optional): `{ parentId, newName }`. Performs deep copy for folders |
| `DELETE` | `/api/files/:id` | ✅ | **Remove**: Move file/folder to trash (Owner) or hide from view (Editor/Viewer). For Owners: Sets global trash flag while preserving hierarchy. For Editors/Viewers: Local hide (non-recursive) |
| `GET` | `/api/files/trash` | ✅ | **Get Trash**: Retrieve top-level items in trash (Owner only). Returns only directly trashed items, not their children |
| `DELETE` | `/api/files/trash/:id` | ✅ | **Permanent Delete**: Permanently destroy file from trash (Owner only). Recursive deletion for folders. Orphans children owned by others (sets parentId=null) |
| `POST` | `/api/files/trash/:id/restore` | ✅ | **Restore**: Bring file back from trash to original location (Owner only). Restores entire hierarchy recursively |
| `DELETE` | `/api/files/trash` | ✅ | **Empty Trash**: Permanently delete all trashed items (Owner only). Bulk deletion starting from top-level items |
| `POST` | `/api/files/trash/restore` | ✅ | **Restore All**: Restore all items from trash (Owner only). Bulk restore of entire trash hierarchy |
| `GET` | `/api/search/:query` | ✅ | **Search**: Global search by name or content |
| `GET` | `/api/files/:id/permissions` | ✅ | **Get Permissions**: Retrieve all permissions for a specific file/folder |
| `POST` | `/api/files/:id/permissions` | ✅ | **Grant Permission**: Create new permission for a user. Body: `{ targetUserId, permissionLevel }`. Levels: VIEWER, EDITOR, or OWNER. When `permissionLevel=OWNER`, ownership transfer occurs (requester must be current owner) |
| `PATCH` | `/api/files/:id/permissions/:pId` | ✅ | **Update Permission**: Modify permission level. Body: `{ permissionLevel }`. Allowed levels: VIEWER, EDITOR, or OWNER. When `permissionLevel=OWNER`, ownership transfer occurs (requester must be current owner) |
| `DELETE` | `/api/files/:id/permissions/:pId` | ✅ | **Revoke Permission**: Remove a specific permission |

---

## User Privacy & Profile Access

OverDrive implements privacy-aware user profile access with differential data exposure based on ownership.

### Profile Data Levels

When accessing user profiles via `GET /api/users/:id`, the returned data varies based on the relationship between the requester and the profile owner:

#### Owner Access (Full Profile)
When users access **their own profile**, they receive complete account information:

| Field | Type | Description |
|:---:|:---:|:---|
| `id` | String (UUID) | User's unique identifier |
| `username` | String (Email) | User's email address |
| `firstName` | String | User's first name |
| `lastName` | String \| null | User's last name (optional) |
| `profileImage` | String \| null | Base64 image or URL |
| `storageUsed` | Number | Storage consumed in bytes |
| `createdAt` | ISO 8601 | Account creation timestamp |
| `modifiedAt` | ISO 8601 | Last modification timestamp |

#### Non-Owner Access (Limited Profile)
When users access **another user's profile**, they receive only public information for privacy protection:

| Field | Type | Description |
|:---:|:---:|:---|
| `id` | String (UUID) | User's unique identifier |
| `firstName` | String | User's first name |
| `lastName` | String \| null | User's last name (optional) |
| `username` | String (Email) | User's email address |
| `profileImage` | String \| null | Base64 image or URL |

**Hidden Fields for Non-Owners:**
- `storageUsed` - Storage consumption details are private
- `createdAt` - Account creation date is private
- `modifiedAt` - Last modification date is private
- `password` - Never exposed in any response

### Use Cases

This privacy model enables:
- **Sharing Collaboration**: Users can see basic info about people they're sharing files with
- **User Discovery**: Limited profile data allows identifying collaborators without exposing sensitive details
- **Account Management**: Full profile access for account owners to manage their own data
- **Privacy Protection**: Non-owners cannot access storage usage, timestamps, or other private information

### Example Responses

```bash
# Owner accessing own profile
GET /api/users/user-123
Authorization: Bearer <owner-token>

Response (200 OK):
{
  "id": "user-123",
  "username": "alice@gmail.com",
  "firstName": "Alice",
  "lastName": "Anderson",
  "profileImage": "data:image/png;base64,...",
  "storageUsed": 10485760,
  "createdAt": "2025-01-01T12:00:00.000Z",
  "modifiedAt": "2025-01-06T15:30:00.000Z"
}
```

```bash
# Non-owner accessing another user's profile
GET /api/users/user-123
Authorization: Bearer <other-user-token>

Response (200 OK):
{
  "id": "user-123",
  "firstName": "Alice",
  "lastName": "Anderson",
  "username": "alice@gmail.com",
  "profileImage": "data:image/png;base64,..."
}
```

---

## File Types

OverDrive supports four file types with different content modification behaviors:

| Type | Content Allowed | Content Editable (PATCH) | Description |
|:---:|:---:|:---:|:---|
| `folder` | ❌ | N/A | Container for organizing files. No content field. Zero storage consumption |
| `docs` | ✅ | ✅ | Editable document files. Content can be created and updated via PATCH |
| `pdf` | ✅ | ❌ | PDF documents. Content required on creation but **read-only** after. Only `name` and `parentId` can be updated |
| `image` | ✅ | ❌ | Image files. Content required on creation but **read-only** after. Only `name` and `parentId` can be updated |

**Content Modification Restrictions:**
- Attempting to PATCH the `content` field of `pdf` or `image` files returns:
  ```json
  {
    "error": "Cannot modify content of pdf files - they are read-only"
  }
  ```
- You can still rename or move `pdf`/`image` files using PATCH with `name` or `parentId` fields

---

## User Preferences System

OverDrive provides a personalization system that allows users to customize their experience through preferences.

### Automatic Initialization

**When a user registers** (POST `/api/users`), a preference record is **automatically created** with default values:
- `theme`: `"light"`
- `landingPage`: `"home"`

This ensures every user has preferences available immediately after registration without requiring explicit setup.

### Preference Schema

| Field | Type | Allowed Values | Default | Description |
|:---:|:---:|:---:|:---:|:---|
| `userId` | String (UUID) | - | - | Links preference to its owner (1:1 relationship) |
| `theme` | String | `"light"`, `"dark"`, `"system"` | `"light"` | UI color scheme preference (`"system"` uses device default) |
| `landingPage` | String | `"home"`, `"storage"` | `"home"` | Default page after login |

### API Usage

#### Get User Preferences
```bash
GET /api/users/:id/preference
Authorization: Bearer <token>

# Response (200 OK):
{
  "userId": "user-123",
  "theme": "light",
  "landingPage": "home"
}
```

#### Update Preferences (Partial Update)
```bash
# Update only theme
PATCH /api/users/:id/preference
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "dark"
}

# Update both fields
PATCH /api/users/:id/preference
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "dark",
  "landingPage": "storage"
}

# Response: 204 No Content
```

#### Validation & Security

**Input Validation:**
- Invalid theme values (e.g., `"blue"`) → `400 Bad Request`
- Invalid landingPage values (e.g., `"dashboard"`) → `400 Bad Request`
- Unknown fields → `400 Bad Request`

**User Isolation:**
- Users can **only** access their own preferences
- Attempting to access another user's preferences → `403 Forbidden`

**Example Error:**
```json
{
  "error": "Invalid theme: blue. Must be one of: light, dark"
}
```

---

## Advanced Filtering via HTTP Headers

OverDrive supports sophisticated client-side filtering for file retrieval endpoints through custom HTTP headers. This allows clients to filter results by file type, modification date, and ownership **without modifying the URL**.

### Supported Endpoints

The following endpoints support filtering via HTTP headers:
- `GET /api/files` - List all files at root level
- `GET /api/files/starred` - Get starred files
- `GET /api/files/recent` - Get recently accessed files
- `GET /api/files/shared` - Get files shared with me
- `GET /api/files/trash` - Get trash items (ownership filter ignored)

### Filter Headers

| Header | Values | Description |
|:---|:---|:---|
| `x-filter-type` | `image`, `folder`, `pdf`, `docs` | Filter by file type. Can specify multiple comma-separated values: `image,pdf` |
| `x-filter-date-category` | `today`, `last7days`, `last30days`, `thisyear`, `lastyear` | Filter by predefined date ranges based on modification date |
| `x-filter-date-start` | ISO 8601 date | Custom date range start (inclusive). Requires `x-filter-date-end` |
| `x-filter-date-end` | ISO 8601 date | Custom date range end (inclusive). Requires `x-filter-date-start` |
| `x-filter-ownership` | `owned`, `shared`, `all` | Filter by file ownership. Default: `all` |

### Filter Logic

**Multiple Filters (AND Logic):**
- When multiple filters are specified, they are combined with **AND** logic
- Example: Type=`image` + Date=`last7days` + Ownership=`owned` → Returns only images you own modified in the last 7 days

**Date Range Priority:**
- If both `x-filter-date-category` and custom dates (`x-filter-date-start`/`x-filter-date-end`) are provided, the custom dates take precedence
- Custom date ranges require **both** start and end dates

**Ownership Filter Restrictions:**
- The `/trash` endpoint **always ignores** the ownership filter (trash shows only your files by design)
- The `/storage` endpoint also ignores the ownership filter

### Usage Examples

#### Filter by File Type
```bash
# Get only images
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: image" \
     http://localhost:3000/api/files

# Get images and PDFs
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: image,pdf" \
     http://localhost:3000/api/files/starred
```

#### Filter by Date Category
```bash
# Get files modified today
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-category: today" \
     http://localhost:3000/api/files

# Get files modified in the last 7 days
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-category: last7days" \
     http://localhost:3000/api/files/recent
```

#### Filter by Custom Date Range
```bash
# Get files modified between Jan 1-15, 2024
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-start: 2024-01-01T00:00:00.000Z" \
     -H "x-filter-date-end: 2024-01-15T23:59:59.999Z" \
     http://localhost:3000/api/files
```

#### Filter by Ownership
```bash
# Get only files you own
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-ownership: owned" \
     http://localhost:3000/api/files

# Get only files shared with you
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-ownership: shared" \
     http://localhost:3000/api/files/starred
```

#### Combine Multiple Filters
```bash
# Get your own images modified in the last 30 days
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: image" \
     -H "x-filter-date-category: last30days" \
     -H "x-filter-ownership: owned" \
     http://localhost:3000/api/files

# Get shared PDFs modified this year
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: pdf" \
     -H "x-filter-date-category: thisyear" \
     -H "x-filter-ownership: shared" \
     http://localhost:3000/api/files/shared
```

### Validation & Error Handling

**Invalid Filter Values:**
```bash
# Invalid file type
curl -H "x-filter-type: video"
# Returns: 400 Bad Request
# { "error": "Invalid file type: video. Allowed types: image, folder, pdf, docs" }

# Invalid date category
curl -H "x-filter-date-category: yesterday"
# Returns: 400 Bad Request
# { "error": "Invalid date category: yesterday. Allowed: today, last7days, last30days, thisyear, lastyear" }

# Invalid ownership value
curl -H "x-filter-ownership: public"
# Returns: 400 Bad Request
# { "error": "Invalid ownership filter: public. Allowed: owned, shared, all" }
```

**Incomplete Custom Date Range:**
```bash
# Missing end date
curl -H "x-filter-date-start: 2024-01-01T00:00:00.000Z"
# Returns: 400 Bad Request
# { "error": "Both x-filter-date-start and x-filter-date-end are required for custom date range" }
```

**Invalid Date Format:**
```bash
# Non-ISO date
curl -H "x-filter-date-start: 01/01/2024" \
     -H "x-filter-date-end: 01/15/2024"
# Returns: 400 Bad Request
# { "error": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)" }
```

**Invalid Date Range (End Before Start):**
```bash
curl -H "x-filter-date-start: 2024-12-31T00:00:00.000Z" \
     -H "x-filter-date-end: 2024-01-01T00:00:00.000Z"
# Returns: 400 Bad Request
# { "error": "Invalid date range: end date must be after start date" }
```

### Behavioral Notes

1. **No Headers = No Filtering:**
   - If no filter headers are provided, all accessible files are returned (default behavior)

2. **Case-Insensitive Values:**
   - Filter values are case-insensitive: `IMAGE` = `image`, `OWNED` = `owned`

3. **Whitespace Handling:**
   - Leading/trailing whitespace in header values is automatically trimmed
   - Multiple types: `"image, pdf"` and `"image,pdf"` are equivalent

4. **Date Category Reference:**
   - `today`: Files modified since midnight (00:00:00) today in server timezone
   - `last7days`: Files modified in the last 7 days (168 hours)
   - `last30days`: Files modified in the last 30 days (720 hours)
   - `thisyear`: Files modified since Jan 1 of current year
   - `lastyear`: Files modified during the previous calendar year only

5. **Ownership Context:**
   - `owned`: Files where you are the owner
   - `shared`: Files where you have VIEWER or EDITOR permissions but are NOT the owner
   - `all`: Both owned and shared files (default)

6. **Empty Results:**
   - If filters exclude all files, the endpoint returns an empty array `[]` with `200 OK`

---

## Advanced Search

OverDrive provides a powerful advanced search endpoint (`GET /api/search/:query`) that combines text-based search with comprehensive filtering capabilities.

### Search Endpoint

**Endpoint:** `GET /api/search/:query`

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
- `query` - The search term (required). This is what you're looking for.

**Description:** Search files by the query term in name and/or content, with optional filters via headers to refine where to search and apply additional filtering.

### Search & Filter Headers

| Header | Values | Description |
|:---|:---|:---|
| **A. Search Location** | | |
| `x-search-in` | `name`, `content`, `both` | Where to search for the query. Default: `both` |
| **B. Metadata Filters** | | |
| `x-filter-type` | `image`, `folder`, `pdf`, `docs` | Filter by file type. Comma-separated for multiple types |
| `x-filter-owner` | `owned`, `shared` | Filter by ownership status |
| `x-filter-starred` | `true`, `false` | Filter by starred status |
| `x-filter-shared-with` | User ID (UUID) | Find files shared with a specific user |
| **C. Date Filters** | | |
| `x-filter-date-category` | `today`, `last7days`, `last30days`, `thisyear`, `lastyear` | Predefined date ranges |
| `x-filter-date-start` | ISO 8601 date | Custom date range start (requires `x-filter-date-end`) |
| `x-filter-date-end` | ISO 8601 date | Custom date range end (requires `x-filter-date-start`) |

### Search Logic

**Text Search Behavior:**
- **Query (required):** The search term is always in the path parameter `:query`
- **Search Location (`x-search-in`):**
  - `name` - Search only in file names
  - `content` - Search only in file content (docs type only)
  - `both` - Search in both name and content (default)
- **Search Logic:** If searching in both, results include files matching **either** name OR content (OR logic)

**Filter Combination:**
- All filters are combined with **AND** logic
- Example: `type=docs` + `owner=owned` + `starred=true` → Only your starred docs
- Filters are applied **after** the text search

**Content Search Limitations:**
- Content search only works on `docs` type files
- Binary files (`image`, `pdf`) are excluded from content search
- Folders have no content to search

### Usage Examples

#### Basic Text Search

```bash
# Search "report" in both name and content (default)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/search/report

# Search only in file names
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: name" \
     http://localhost:3000/api/search/project

# Search only in content
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: content" \
     http://localhost:3000/api/search/confidential
```

#### Search with Type Filter

```bash
# Find all PDFs with "report" in the name
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: name" \
     -H "x-filter-type: pdf" \
     http://localhost:3000/api/search/report

# Find docs containing "quarterly"
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: content" \
     -H "x-filter-type: docs" \
     http://localhost:3000/api/search/quarterly
```

#### Search with Ownership Filter

```bash
# Find your own files with "draft" in name
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: name" \
     -H "x-filter-owner: owned" \
     http://localhost:3000/api/search/draft

# Find shared files containing "collaboration"
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: content" \
     -H "x-filter-owner: shared" \
     http://localhost:3000/api/search/collaboration
```

#### Search with Date Filters

```bash
# Find files modified today with "urgent" in name
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-category: today" \
     http://localhost:3000/api/search/urgent

# Find files from last 7 days containing "meeting"
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: content" \
     -H "x-filter-date-category: last7days" \
     http://localhost:3000/api/search/meeting

# Custom date range
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-start: 2025-01-01T00:00:00.000Z" \
     -H "x-filter-date-end: 2025-12-31T23:59:59.999Z" \
     http://localhost:3000/api/search/report
```

#### Search with Starred Filter

```bash
# Find all starred files with "important" in name or content
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-starred: true" \
     http://localhost:3000/api/search/important

# Find non-starred docs containing "draft"
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: content" \
     -H "x-filter-type: docs" \
     -H "x-filter-starred: false" \
     http://localhost:3000/api/search/draft
```

#### Complex Multi-Filter Queries

```bash
# Triple threat: search term + type + date
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: pdf,docs" \
     -H "x-filter-date-category: last30days" \
     http://localhost:3000/api/search/project

# Ultimate query: 5 filters combined
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: name" \
     -H "x-filter-type: pdf" \
     -H "x-filter-owner: owned" \
     -H "x-filter-starred: true" \
     -H "x-filter-date-category: thisyear" \
     http://localhost:3000/api/search/report

# Find files shared with a specific user
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-shared-with: user-456-uuid" \
     http://localhost:3000/api/search/team
```

### Validation & Error Handling

**Invalid Search Location:**
```bash
# Error: Invalid x-search-in value
curl -H "Authorization: Bearer <token>" \
     -H "x-search-in: invalid" \
     http://localhost:3000/api/search/test
# Returns: 400 Bad Request - "Invalid search-in value: invalid. Must be 'name', 'content', or 'both'"
```

**Invalid Type:**
```bash
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-type: video" \
     http://localhost:3000/api/search/test

# Returns: 400 Bad Request
# { "error": "Invalid file type: video. Allowed types: image, folder, pdf, docs" }
```

**Invalid Owner:**
```bash
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-owner: public" \
     http://localhost:3000/api/search/test

# Returns: 400 Bad Request
# { "error": "Invalid owner filter: public. Must be 'owned' or 'shared'" }
```

**Invalid Starred Value:**
```bash
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-starred: yes" \
     http://localhost:3000/api/search/test

# Returns: 400 Bad Request
# { "error": "Invalid starred filter: must be \"true\" or \"false\"" }
```

**Invalid Date Range:**
```bash
curl -H "Authorization: Bearer <token>" \
     -H "x-filter-date-start: 2025-12-31T00:00:00.000Z" \
     -H "x-filter-date-end: 2025-01-01T00:00:00.000Z" \
     http://localhost:3000/api/search/test

# Returns: 400 Bad Request
# { "error": "Invalid date range: end date must be after start date" }
```

### Search Response

**Successful Search:**
```json
[
  {
    "id": "file-123",
    "name": "Q4_Report.pdf",
    "type": "pdf",
    "ownerId": "user-456",
    "parentId": null,
    "size": 245760,
    "isTrashed": false,
    "createdAt": "2025-10-15T10:30:00.000Z",
    "modifiedAt": "2025-12-20T14:45:00.000Z",
    "isStarred": true,
    "lastViewedAt": "2026-01-05T09:20:00.000Z",
    "lastEditedAt": null
  }
]
```

**No Results:**
```json
[]
```

### Search Behavioral Notes

1. **Case-Insensitive:** All text searches are case-insensitive
2. **Substring Matching:** Search terms use substring matching (e.g., "rep" matches "report", "reporting", "repository")
3. **Whitespace Trimming:** Leading/trailing whitespace in all header values is automatically removed
4. **Security:** Only returns files the authenticated user has permission to access
5. **Trash Exclusion:** Trashed files are automatically excluded from search results
6. **Folder Content:** Folders have no searchable content (content search skips folders)
7. **Performance:** Content search requires fetching file content from storage server, which may be slower for large result sets

---

## Storage Management: Owner-Based Quotas

OverDrive implements a **file ownership-based storage quota system** similar to Google Drive, where storage consumption is attributed to file owners rather than folder containers.

### Key Principles

#### 1. **Ownership-Based Accounting**
- Storage is tracked **per file owner**, not per folder
- Only files **you own** count toward your storage quota
- Folders themselves consume **zero storage**
- Shared files from others **do not** consume your storage

#### 2. **Storage Tracking Behavior**

**File Creation:**
- When you upload a file, its size is added to **your** storage usage
- Initial creation sets `ownerId` and tracks the file size

**File Updates:**
- Updating file content adjusts the **file owner's** storage
- If content grows from 10 bytes to 100 bytes, owner's storage increases by 90 bytes
- If content shrinks, owner's storage decreases accordingly

**File Deletion:**
- Deleting a file **frees storage** for its owner
- Recursive folder deletion correctly attributes freed space to each file's owner
- Example: Folder with 3 files owned by different users frees storage for all 3 owners

**File Copy:**
- When you copy a file, **you become the owner** of the copy
- The copy's size is added to **your** storage, not the original owner's
- Original file still counts toward original owner's quota

**Ownership Transfer:**
- Transferring ownership of a file moves storage accounting to the new owner
- Original owner's storage decreases, new owner's storage increases

#### 3. **Storage Limits**

**Default Limit:**
- Configurable via environment variable `STORAGE_LIMIT_MB` (default: 100 MB)
- Set in `docker-compose.yml` or `.env` file

**Enforcement:**
- Users **cannot exceed** their storage limit when:
  - Creating new files
  - Updating existing files with larger content
  - Copying files
- API returns `400 Bad Request` with detailed error message showing available vs required space

**Example:**
```bash
# If user has 99 MB used and tries to upload 2 MB:
{
  "error": "Upload failed: Storage limit exceeded. Available: 1024 KB, Required: 2048 KB"
}
```

#### 4. **Storage API Endpoint**

**GET /api/storage** provides detailed storage information:
```json
{
  "storageUsed": 10485760,           // Bytes
  "storageLimit": 104857600,         // Bytes  
  "storageAvailable": 94371840,      // Bytes
  "storageUsedMB": 10.0,             // Megabytes
  "storageLimitMB": 100,             // Megabytes
  "storageAvailableMB": 90.0,        // Megabytes
  "usagePercentage": 10.0            // Percent
}
```

### Example Scenarios

#### Scenario 1: Shared File Storage
```
User A uploads file.txt (1 MB) → User A: +1 MB
User A shares file.txt with User B (VIEWER) → User B: +0 MB ✅
User A shares file.txt with User C (EDITOR) → User C: +0 MB ✅
```
**Result:** Only User A (owner) uses 1 MB of storage

#### Scenario 2: Folder Deletion
```
Folder "SharedProject" contains:
  - doc1.txt (Owner: User A, 500 KB)
  - doc2.txt (Owner: User B, 300 KB)  
  - doc3.txt (Owner: User A, 200 KB)

User A deletes "SharedProject" →
  - User A storage: -700 KB (doc1 + doc3)
  - User B storage: -300 KB (doc2)
```

#### Scenario 3: File Copy
```
User A owns large.txt (10 MB)
User B copies large.txt →
  - User A storage: 10 MB (unchanged)
  - User B storage: +10 MB (becomes owner of copy)
```

---

## Permission System: Recursive Permissions & Inheritance

OverDrive implements a sophisticated **recursive permission system** for folders, allowing granular access control with automatic inheritance and smart deletion.

### Key Concepts

#### 1. **Permission Levels**
- **VIEWER**: Can read files and list folder contents
- **EDITOR**: Can modify files, create/delete within folders
- **OWNER**: Full control including permission management and ownership transfer

#### 2. **Permission Strength Hierarchy**
When a user has multiple permissions on the same file (direct + inherited), the **strongest permission wins**:
```
OWNER (3) > EDITOR (2) > VIEWER (1)
```

**Example**: If a user has:
- Inherited VIEWER from parent folder
- Direct EDITOR on specific file
→ **Effective permission: EDITOR** ✅

### Recursive Permission Grant

When granting permission on a **folder**, the permission automatically propagates to **all children** (files and subfolders):

```
MainFolder (User2: VIEWER)
├── SubFolder (User2: VIEWER - inherited)
│   └── file.txt (User2: VIEWER - inherited)
└── doc.pdf (User2: VIEWER - inherited)
```

**Implementation Details:**
- Each inherited permission is marked with `isInherited: true`
- The `inheritedFrom` field stores the parent folder ID
- Recursive propagation happens at grant time
- Permissions are stored per-file for fast lookup

### Direct vs Inherited Permissions

Users can have **both** direct and inherited permissions on the same file. The system tracks them separately:

```javascript
// Example: User has two permissions on file.txt
[
  { level: "VIEWER", isInherited: true, inheritedFrom: "folder-123" },
  { level: "EDITOR", isInherited: false }  // Direct permission
]
// Effective permission: EDITOR (strongest)
```

### Smart Permission Deletion

When deleting a folder permission, the system uses **intelligent recursive deletion**:

✅ **Removes**: All inherited permissions from that folder
❌ **Preserves**: Direct permissions granted explicitly

**Example Scenario:**
```
1. Grant VIEWER on MainFolder to User2
   → User2 gets inherited VIEWER on all children

2. Grant EDITOR directly on file.txt to User2
   → User2 now has: inherited VIEWER + direct EDITOR = EDITOR

3. Delete permission on MainFolder
   → Inherited VIEWER removed from all children
   → Direct EDITOR on file.txt PRESERVED ✅
   
Result: User2 still has EDITOR access to file.txt!
```

**Implementation:**
```javascript
// Only delete permissions with matching inheritedFrom
DELETE WHERE isInherited = true AND inheritedFrom = deletedFolderId
```

### Ownership Transfer Rules

#### POST Cannot Grant OWNER
```bash
# ❌ This will FAIL:
POST /api/files/:id/permissions
{ "targetUserId": "user-123", "permissionLevel": "OWNER" }

# Error: "Cannot grant OWNER permission via POST. Use PATCH to transfer ownership"
```

#### PATCH Can Transfer Ownership
```bash
# ✅ This works (requester must be current owner):
PATCH /api/files/:id/permissions/:pid
{ "permissionLevel": "OWNER" }
```

#### Ownership Transfer is NON-Recursive
When transferring folder ownership:
- **Folder ownership**: Transferred ✅
- **Children ownership**: NOT transferred ❌

```
Before:
MainFolder (Owner: User1)
├── file1.txt (Owner: User1)
└── file2.txt (Owner: User1)

After transferring MainFolder ownership to User2:
MainFolder (Owner: User2) ✅
├── file1.txt (Owner: User1) ← Still User1!
└── file2.txt (Owner: User1) ← Still User1!
```

### Best Practices

1. **Use folder permissions for teams**: Grant permission on parent folder instead of individual files
2. **Use direct permissions for exceptions**: Override inherited permissions when needed
3. **Check effective permissions**: Remember that direct permissions override inherited ones
4. **Ownership transfer carefully**: Child files retain original owner - transfer individually if needed

### Technical Implementation

The permission system uses:
- **Triple indexing**: By permission ID, by user ID, and by file ID for O(1) lookups
- **Lazy evaluation**: Effective permission calculated at check time (not stored)
- **Atomic operations**: Permission grant/delete are transactional
- **Owner bypass**: File owners automatically have all permissions (no explicit permission record needed)

---

## Trash Management: Remove, Delete, and Restore

OverDrive implements a sophisticated trash system that differentiates between **temporary removal** (trash) and **permanent deletion**, with role-based behavior for Owners vs Editors/Viewers.

### Core Constraint
Every file/folder has **exactly one parent**. Root items have `parentId = null`. This hierarchy is **preserved** during trash operations.

### Key Concepts

#### 1. **Remove Operation** (DELETE /api/files/:id)
Behavior depends on user role:

**For Owner:**
- Sets global flag `isTrashed = true`
- **Crucial:** `parentId` is **NOT changed** - preserves original location
- File becomes globally invisible to all users (Editors and Viewers)
- Editors/Viewers see "File is in Owner's Trash" error if accessed via direct link
- **Recursive impact**: All children owned by this Owner are implicitly trashed (visibility check traverses parent chain)

**For Editor/Viewer:**
- This is a **Local Remove** (Unlink)
- Sets `isHiddenForUser = true` in the permission record
- File disappears **only** from this user's view (e.g., "Shared with me")
- **Non-recursive**: Only affects the specific item, not its children
- No impact on Owner or other collaborators

```javascript
// Example: Owner removes folder
DELETE /api/files/folder-123
→ { isTrashed: true, parentId: "parent-folder" }  // parentId preserved!

// Example: Editor removes folder
DELETE /api/files/folder-123  
→ Permission updated: { isHiddenForUser: true }  // Only local hide
```

#### 2. **Trash Listing** (GET /api/files/trash)
Returns **only top-level trashed items** for clean hierarchical view:

```
Trashed Items (returned):
├── MainFolder (trashed)
│   ├── SubFolder (implicitly trashed - NOT returned)
│   └── file.txt (implicitly trashed - NOT returned)
└── StandaloneFile.txt (trashed)

API returns: [MainFolder, StandaloneFile.txt]
```

**Implementation:**
- Filters to items with `isTrashed = true`
- Excludes items whose parent is also trashed
- Only owner can see their trash

#### 3. **Permanent Delete** (DELETE /api/files/trash/:id)
**Authorization**: Owner only. File must be in trash.

**Actions:**
1. **Physical deletion** from database and storage server
2. **Recursive deletion** for all children owned by this Owner
3. **Orphan handling**: Children owned by different users get `parentId = null`
4. **Storage quota**: Frees storage for the Owner

```javascript
// Example: Permanent delete with orphan handling
Before:
SharedProject (Owner: User1, isTrashed: true)
├── myDoc.txt (Owner: User1)
└── theirDoc.txt (Owner: User2)

After permanent delete:
→ SharedProject: DELETED ✅
→ myDoc.txt: DELETED ✅
→ theirDoc.txt: ORPHANED (parentId = null, still exists for User2) ✅
```

**Storage Impact:**
```bash
User1's folder (10 MB) deleted:
- User1-owned files (8 MB): -8 MB from User1's quota
- User2-owned files (2 MB): -2 MB from User2's quota
```

#### 4. **Restore** (POST /api/files/trash/:id/restore)
**Authorization**: Owner only.

**Actions:**
- Sets `isTrashed = false`
- **ParentID Management**: Since `parentId` was never changed during Remove, the item automatically returns to its **original location**
- **Access restored**: All Editors and Viewers regain access globally
- **Recursive**: Restores all children owned by this Owner

```javascript
// Example: Restore to original location
Original: Reports (parentId: "work-folder")
After Remove: Reports (parentId: "work-folder", isTrashed: true)
After Restore: Reports (parentId: "work-folder", isTrashed: false)
→ File reappears in "work-folder" automatically! ✅
```

#### 5. **Empty Trash** (DELETE /api/files/trash)
Bulk permanent deletion:
- Gets all top-level trash items
- Permanently deletes each (with recursion)
- Returns total count of deleted files

#### 6. **Restore All** (POST /api/files/trash/restore)
Bulk restore:
- Gets all top-level trash items
- Restores each to original location (with recursion)
- Returns total count of restored items

### Hierarchical Visibility Rules

File visibility is determined by traversing the **parent chain**:

```javascript
// Check if file is trashed (recursive check)
function isInTrash(fileId) {
  let current = getFile(fileId);
  while (current) {
    if (current.isTrashed) return true;
    if (current.parentId === null) break;
    current = getFile(current.parentId);
  }
  return false;
}
```

**Example:**
```
MainFolder (isTrashed: false)
└── SubFolder (isTrashed: true)
    └── file.txt (isTrashed: false)

isInTrash("file.txt") → true ✅  // Parent is trashed
```

#### Trashed Files Exclusion from Listings

Files in trash are **excluded from all regular listings** to prevent confusion:

- **GET /api/files** - Root folder listing
- **GET /api/files/:id** - Folder children (when getting folder metadata)
- **GET /api/files/starred** - Starred files
- **GET /api/files/recent** - Recently accessed files
- **GET /api/files/shared** - Shared with me

**However**, Owners **can** access trashed files directly via:
- **GET /api/files/:id** - Direct access by file ID (returns `isTrashed: true`)
- **GET /api/files/trash** - Dedicated trash listing endpoint

**Non-owners** attempting to access a trashed file will receive:
- **403 Forbidden** - "Permission denied"

This ensures trashed content is isolated and only accessible through the trash interface.

### API Examples

#### Owner Workflow
```bash
# 1. Move to trash
curl -X DELETE http://localhost:3000/api/files/folder-123 \
  -H "Authorization: Bearer <TOKEN>"
→ Folder moved to trash, all users lose access

# 2. View trash
curl -X GET http://localhost:3000/api/files/trash \
  -H "Authorization: Bearer <TOKEN>"
→ Returns: [{ id: "folder-123", name: "MyFolder", isTrashed: true, ... }]

# 3. Restore
curl -X POST http://localhost:3000/api/files/trash/folder-123/restore \
  -H "Authorization: Bearer <TOKEN>"
→ Folder restored to original location, access restored

# 4. Permanent delete
curl -X DELETE http://localhost:3000/api/files/trash/folder-123 \
  -H "Authorization: Bearer <TOKEN>"
→ Folder permanently destroyed, storage freed

# 5. Empty entire trash
curl -X DELETE http://localhost:3000/api/files/trash \
  -H "Authorization: Bearer <TOKEN>"
→ All trashed items permanently deleted
```

#### Editor/Viewer Workflow
```bash
# Remove from my view (local hide)
curl -X DELETE http://localhost:3000/api/files/shared-file-456 \
  -H "Authorization: Bearer <TOKEN>"
→ File removed from "Shared with me", but still exists for Owner
```

### Error Scenarios

```bash
# Non-owner tries to restore
POST /api/files/trash/:id/restore
→ 403 Forbidden: "Only the owner can restore files"

# Try to permanently delete non-trashed file
DELETE /api/files/trash/:id
→ 400 Bad Request: "File must be in trash before permanent deletion"

# Editor tries to access trashed file
GET /api/files/:id (file is trashed by Owner)
→ 403 Forbidden: "File is in Owner's Trash"
```

### Best Practices

1. **Two-step deletion safety**: Files go to trash first, preventing accidental data loss
2. **Preserve hierarchy**: `parentId` is never modified during trash, ensuring files return to correct location
3. **Role-based removal**: Owners trash globally, Editors/Viewers hide locally
4. **Orphan management**: Shared files from others become root-level items when parent is deleted
5. **Storage tracking**: Permanent deletion correctly frees quota for all file owners

---

## Download & Export: Polymorphic File Retrieval

The `/api/files/:id/download` endpoint provides a unified interface for retrieving resources in their final user format, bridging the gap between Base64/RLE-encoded storage and browser-ready files.

### Feature Overview

**Endpoint**: `GET /api/files/:id/download`
**Authentication**: Required (JWT)
**Authorization**: Minimum VIEWER permission required

### Use Cases

#### Case A: Single File Download (docs, pdf, image)

Downloads a **real file** that browsers and OS applications can open natively.

**Process Flow:**
1. Retrieve content from Storage Server via `GET <fileId>`
2. Content is automatically uncompressed (RLE bypassed by C++ logic)
3. Binary decoding based on file type:
   - **Images & PDFs**: Base64 → Binary Buffer
   - **Docs**: UTF-8 text → Buffer
4. HTTP response with appropriate headers:
   - `Content-Type`: Set based on file type (`image/jpeg`, `application/pdf`, `text/plain`)
   - `Content-Disposition`: `attachment; filename="original_name.ext"`
   - `Content-Length`: File size in bytes

**Example Request:**
```bash
# Download a PDF file
curl -X GET http://localhost:3000/api/files/file-123/download \
  -H "Authorization: Bearer <TOKEN>" \
  --output document.pdf

# Download an image
curl -X GET http://localhost:3000/api/files/img-456/download \
  -H "Authorization: Bearer <TOKEN>" \
  --output photo.jpg

# Download a text document
curl -X GET http://localhost:3000/api/files/doc-789/download \
  -H "Authorization: Bearer <TOKEN>" \
  --output notes.txt
```

**Response:**
- Status: `200 OK`
- Headers:
  ```
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="document.pdf"
  Content-Length: 524288
  ```
- Body: Raw binary file data (streamed)

#### Case B: Folder Export (Flattened Recursive JSON)

Exports all files within a folder as a unified JSON array, bypassing the need for ZIP archives.

**Process Flow:**
1. Perform **Depth-First Search (DFS)** starting from target folder
2. Traverse recursively through all subfolders
3. Collect all files into a **flat array** (folders excluded from final list)
4. For each file:
   - Calculate **relative path** from parent folder (e.g., `ParentFolder/SubFolder/document.pdf`)
   - Fetch **uncompressed content** from Storage Server
   - Include full metadata
5. Return JSON array

**Example Request:**
```bash
# Export entire folder structure
curl -X GET http://localhost:3000/api/files/folder-123/download \
  -H "Authorization: Bearer <TOKEN>" \
  > folder_export.json
```

**Response:**
- Status: `200 OK`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body:
```json
[
  {
    "id": "file-001",
    "name": "document.pdf",
    "type": "pdf",
    "path": "document.pdf",
    "size": 524288,
    "content": "JVBERi0xLjQKJeLjz9MK...",
    "modifiedAt": "2026-01-04T10:30:00.000Z",
    "createdAt": "2026-01-01T08:00:00.000Z"
  },
  {
    "id": "file-002",
    "name": "readme.txt",
    "type": "docs",
    "path": "Docs/readme.txt",
    "size": 1024,
    "content": "Welcome to OverDrive...",
    "modifiedAt": "2026-01-03T14:20:00.000Z",
    "createdAt": "2026-01-02T09:15:00.000Z"
  },
  {
    "id": "file-003",
    "name": "photo.jpg",
    "type": "image",
    "path": "Images/Vacation/photo.jpg",
    "size": 2097152,
    "content": "/9j/4AAQSkZJRgABAQEA...",
    "modifiedAt": "2026-01-04T11:45:00.000Z",
    "createdAt": "2026-01-03T16:30:00.000Z"
  }
]
```

### Key Features

**1. Permission-Aware Export**
- Only includes files where user has **Read** permission
- Silently skips files without access (no error thrown)
- Respects permission hierarchy

**2. Flattened Structure**
- No nested JSON objects
- Single-level array for easy processing
- Relative paths preserve logical hierarchy

**3. Uncompressed Content**
- All content is decompressed (RLE removed)
- Ready for immediate use or re-upload
- Base64 encoding preserved for binary files

**4. Selective File Inclusion**
- Folders are traversed but **not included** in final array
- Only actual files (docs, pdf, image) are exported
- Trashed items are automatically excluded

**5. Path Generation**
- Paths are relative to the exported folder
- Format: `SubFolder1/SubFolder2/filename.ext`
- Root-level files have simple `filename.ext` path

### Use Cases

**Content Migration:**
```bash
# Export project folder for archival
curl -X GET http://localhost:3000/api/files/project-folder/download \
  -H "Authorization: Bearer <TOKEN>" \
  > project_backup.json
```

**Bulk Processing:**
```javascript
// Download folder export and process all files
const response = await fetch('/api/files/folder-123/download', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const files = await response.json();

// Process each file
files.forEach(file => {
  if (file.type === 'docs') {
    // Process text content
    console.log(`${file.path}: ${file.content}`);
  } else if (file.type === 'image') {
    // Decode Base64 image
    const img = Buffer.from(file.content, 'base64');
  }
});
```

**Folder Analysis:**
```bash
# Get complete folder inventory
curl -X GET http://localhost:3000/api/files/reports/download \
  -H "Authorization: Bearer <TOKEN>" \
  | jq 'length'  # Count total files

# Calculate total folder size
curl -X GET http://localhost:3000/api/files/reports/download \
  -H "Authorization: Bearer <TOKEN>" \
  | jq '[.[].size] | add'  # Sum all file sizes
```

### Error Handling

```bash
# File not found
GET /api/files/invalid-id/download
→ 404 Not Found: "File not found"

# Permission denied
GET /api/files/restricted-file/download
→ 403 Forbidden: "Permission denied"

# Storage server unreachable
GET /api/files/file-123/download
→ 500 Internal Server Error: "Failed to retrieve file from storage"
```

### Best Practices

1. **Single Files**: Use download for browser-ready files (PDFs, images, documents)
2. **Folder Exports**: Use for bulk processing, archival, or content migration
3. **Permission Checks**: Endpoint respects all permission rules (inherited + direct)
4. **Large Folders**: Consider implementing pagination for very large folder exports
5. **Content Decoding**: Images/PDFs are Base64-encoded in JSON, decode before use

---

### Status Codes
- `200 OK` - Success.
- `201 Created` - Resource created successfully.
- `204 No Content` - Success with no response body (update/delete operations).
- `400 Bad Request` - Validation failed (e.g., invalid email, missing fields).
- `401 Unauthorized` - Missing or invalid JWT token.
- `403 Forbidden` - User lacks permission to access the resource.
- `404 Not Found` - Resource or User does not exist.
- `409 Conflict` - Resource already exists (e.g., duplicate username).

---

## API Usage Guide (Interactive Demo)
Follow these steps to explore the system. Replace <...> values with actual IDs returned from the server.

### 1. Identity & Access
1.1 Register User
```Bash
curl -i -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"<GMAIL_ADDRESS>\",\"password\":\"<PASSWORD>\",\"firstName\":\"<FIRST_NAME>\",\"lastName\":\"<LAST_NAME>\",\"profileImage\":\"data:image/png;base64,<BASE64_IMAGE>\"}"
```
Expected Response: 201 Created. Header Location contains the USER_ID.
Note: `lastName` is optional. `profileImage` is required and must be a Base64-encoded image string (e.g., "data:image/png;base64,iVBORw0KG...").

1.2 User Login
```Bash
curl -i -X POST http://localhost:3000/api/tokens \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"<GMAIL_ADDRESS>\",\"password\":\"<PASSWORD>\"}"
```
Expected Response: 200 OK. Body: `{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}`. Save this token for subsequent requests.

**Note**: The JWT token is valid for 24 hours and must be included in the `Authorization` header as `Bearer <TOKEN>` for all protected endpoints.

1.3 Get User Profile
```Bash
# Owner accessing their own profile (full details)
curl -i -X GET http://localhost:3000/api/users/<USER_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Body: Full user object (id, username, firstName, lastName, profileImage, storageUsed, createdAt, modifiedAt).

```Bash
# Non-owner accessing another user's profile (limited details)
curl -i -X GET http://localhost:3000/api/users/<OTHER_USER_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Body: Limited public profile (id, firstName, lastName, username, profileImage).

**Note**: Owners receive full profile details including storage usage and timestamps. Non-owners receive only public information (id, firstName, lastName, username, profileImage) for privacy protection.

1.4 Update User Profile
```Bash
# Update password
curl -i -X PATCH http://localhost:3000/api/users/<USER_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"password\":\"<NEW_PASSWORD>\"}"

# Update first name and last name
curl -i -X PATCH http://localhost:3000/api/users/<USER_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"firstName\":\"<NEW_FIRST_NAME>\",\"lastName\":\"<NEW_LAST_NAME>\"}"

# Remove last name (set to null)
curl -i -X PATCH http://localhost:3000/api/users/<USER_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"lastName\":null}"

# Remove profile image (set to null)
curl -i -X PATCH http://localhost:3000/api/users/<USER_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"profileImage\":null}"
```
Expected Response: 204 No Content.
**Note**: Username cannot be changed. Users can only update their own profile.

1.5 Get Storage Information
```Bash
curl -i -X GET http://localhost:3000/api/storage \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Body: Storage usage details
```json
{
  "storageUsed": 10485760,
  "storageLimit": 104857600,
  "storageAvailable": 94371840,
  "storageUsedMB": 10.0,
  "storageLimitMB": 100,
  "storageAvailableMB": 90.0,
  "usagePercentage": 10.0
}
```
**Note**: Storage is tracked per file owner. Only files you own count toward your quota. The limit is configurable via `STORAGE_LIMIT_MB` environment variable (default: 100 MB).

### 2. File & Folder Management
2.1 Create Folder
```Bash
curl -i -X POST http://localhost:3000/api/files \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"Work_Project\",\"type\":\"folder\"}"
```
Expected Response: 201 Created. Header Location contains the FOLDER_ID.

2.2 Upload File (with RLE Compression)
```Bash
# Upload docs file (editable)
curl -i -X POST http://localhost:3000/api/files \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"notes.txt\",\"content\":\"AAAAABBBBB\",\"type\":\"docs\",\"parentId\":\"<FOLDER_ID_OR_NULL>\"}"

# Upload PDF (read-only content)
curl -i -X POST http://localhost:3000/api/files \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"document.pdf\",\"content\":\"PDF_BINARY_DATA\",\"type\":\"pdf\",\"parentId\":\"<FOLDER_ID_OR_NULL>\"}"

# Upload Image (read-only content)
curl -i -X POST http://localhost:3000/api/files \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"photo.jpg\",\"content\":\"IMAGE_BINARY_DATA\",\"type\":\"image\",\"parentId\":\"<FOLDER_ID_OR_NULL>\"}"
```
Expected Response: 201 Created. Data is automatically compressed in the C++ backend.

**Supported File Types:**
- `folder`: Container for organizing files (no content)
- `docs`: Editable document files (text content can be updated via PATCH)
- `pdf`: PDF documents (read-only content, only name/parentId can be updated)
- `image`: Image files (read-only content, only name/parentId can be updated)

2.3 List All Files (Tree Root)
```Bash
curl -i -X GET http://localhost:3000/api/files \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns an array of file/folder objects.

2.4 Get File Metadata & Content
```Bash
curl -i -X GET http://localhost:3000/api/files/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Content is transparently decompressed and returned as plain text. Automatically records a VIEW interaction.

2.5 Update File/Folder (Name, Content, or Location)
```Bash
# Update name
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"new_filename.txt\"}"

# Update content (docs only - pdf/image are read-only)
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"content\":\"Updated content\"}"

# Note: Attempting to update content of pdf or image files returns:
# 400 Bad Request: "Cannot modify content of pdf/image files - they are read-only"

# Move to different parent folder
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"parentId\":\"<NEW_FOLDER_ID>\"}"
```
Expected Response: 204 No Content. Automatically records an EDIT interaction.
Note: You can update name, content, and/or parentId in any combination.

2.5.1 Download File or Export Folder
```Bash
# Download single file (docs, pdf, image)
# Returns decoded binary with proper Content-Type headers
curl -X GET http://localhost:3000/api/files/<FILE_ID>/download \
     -H "Authorization: Bearer <TOKEN>" \
     --output downloaded_file.pdf

# Export folder as flattened JSON array
# Returns all files recursively with uncompressed content and relative paths
curl -X GET http://localhost:3000/api/files/<FOLDER_ID>/download \
     -H "Authorization: Bearer <TOKEN>" \
     > folder_export.json
```
Expected Response for Single File: 200 OK, binary stream with headers:
```
Content-Type: application/pdf  (or image/jpeg, text/plain)
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 524288
```

Expected Response for Folder: 200 OK, JSON array:
```json
[
  {
    "id": "file-001",
    "name": "document.pdf",
    "type": "pdf",
    "path": "document.pdf",
    "size": 524288,
    "content": "JVBERi0xLjQK...",
    "modifiedAt": "2026-01-04T10:30:00.000Z",
    "createdAt": "2026-01-01T08:00:00.000Z"
  },
  {
    "id": "file-002",
    "name": "notes.txt",
    "type": "docs",
    "path": "Subfolder/notes.txt",
    "size": 1024,
    "content": "Uncompressed text content...",
    "modifiedAt": "2026-01-03T14:20:00.000Z",
    "createdAt": "2026-01-02T09:15:00.000Z"
  }
]
```

**Key Features:**
- Single files: Decoded binary (Base64→Binary for images/PDFs, UTF8 for docs)
- Folders: Flattened DFS traversal, no nested structure
- Uncompressed content: RLE decompression handled automatically
- Permission-aware: Only includes files with Read access
- Relative paths: Calculated from parent folder (e.g., `SubFolder/file.txt`)

2.6 Remove File/Folder (Move to Trash or Hide)
```Bash
curl -i -X DELETE http://localhost:3000/api/files/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 204 No Content.
**Owner**: File moved to trash (global), preserves hierarchy. All users lose access.
**Editor/Viewer**: File hidden from your view only (local). No impact on others.

2.7 View Trash Items
```Bash
curl -i -X GET http://localhost:3000/api/files/trash \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns array of top-level trashed items (owner only).

2.8 Restore File from Trash
```Bash
curl -i -X POST http://localhost:3000/api/files/trash/<FILE_ID>/restore \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 204 No Content. File restored to original location. Access restored for all users.

2.9 Permanently Delete File
```Bash
curl -i -X DELETE http://localhost:3000/api/files/trash/<FILE_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 204 No Content. File permanently destroyed. Cannot be undone. Frees storage quota.

2.10 Empty Trash (Delete All)
```Bash
curl -i -X DELETE http://localhost:3000/api/files/trash \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. All trashed items permanently deleted.
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Permanently deleted 5 file(s) from trash"
}
```

2.11 Restore All Trash Items
```Bash
curl -i -X POST http://localhost:3000/api/files/trash/restore \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. All trashed items restored to original locations.
```json
{
  "success": true,
  "restoredCount": 5,
  "message": "Restored 5 item(s) from trash"
}
```

### 3. Advanced Features
3.1 Smart Search (Name & Content)
```Bash
curl -i -X GET http://localhost:3000/api/search/<TERM> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Searches file names and performs deep-content search within compressed RLE data.

3.2 Get File/Folder Permissions
```Bash
curl -i -X GET http://localhost:3000/api/files/<FILE_ID>/permissions \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns array of all permissions for the file/folder.

**Response Structure:**
Each permission object includes:
- `pid`: Permission ID
- `fileId`: File or folder ID
- `userId`: User who has the permission
- `level`: Permission level (VIEWER, EDITOR, OWNER)
- `isInherited`: Whether permission was inherited from parent folder
- `inheritedFrom`: Parent folder ID (if inherited)
- `createdBy`: User ID of who granted this permission
- `user`: Object with user details (id, username, firstName, lastName)
- `sharedBy`: Object with details of who shared/granted this permission (id, username, firstName, lastName), or `null` for inherited permissions

**Example Response:**
```json
[
  {
    "pid": "perm-123",
    "fileId": "file-456",
    "userId": "user-789",
    "level": "EDITOR",
    "isInherited": false,
    "inheritedFrom": null,
    "createdBy": "user-owner-123",
    "createdAt": "2026-01-05T10:30:00.000Z",
    "modifiedAt": "2026-01-05T10:30:00.000Z",
    "user": {
      "id": "user-789",
      "username": "editor@gmail.com",
      "firstName": "Robert",
      "lastName": "Smith"
    },
    "sharedBy": {
      "id": "user-owner-123",
      "username": "owner@gmail.com",
      "firstName": "Alicia",
      "lastName": "Johnson"
    }
  }
]
```

3.3 Grant Permission (RBAC)
```Bash
curl -i -X POST http://localhost:3000/api/files/<FILE_ID>/permissions \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"targetUserId\":\"<GUEST_ID>\",\"permissionLevel\":\"VIEWER\"}"
```
Expected Response: 201 Created. Header Location contains the permission ID.
Supported levels: VIEWER, EDITOR, OWNER.

3.4 Update Permission Level (or Transfer Ownership)
```Bash
# Change permission level to EDITOR
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID>/permissions/<PERMISSION_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"permissionLevel\":\"EDITOR\"}"

# Transfer ownership to the user who has this permission
curl -i -X PATCH http://localhost:3000/api/files/<FILE_ID>/permissions/<PERMISSION_ID> \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d "{\"permissionLevel\":\"OWNER\"}"
```
Expected Response: 204 No Content.
Note: Supported levels are VIEWER, EDITOR, or OWNER. When setting OWNER, ownership is transferred to the user who has this permission (requester must be current owner).

3.5 Revoke Permission
```Bash
curl -i -X DELETE http://localhost:3000/api/files/<FILE_ID>/permissions/<PERMISSION_ID> \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 204 No Content.

### 4. User Activity Tracking: Starred & Recent Files

4.1 Star a File
```Bash
curl -i -X POST http://localhost:3000/api/files/<FILE_ID>/star \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Body: `{"fileId": "...", "isStarred": true}`
Note: Calling this endpoint again will toggle the star status (unstar the file).

4.2 Get Starred Files
```Bash
curl -i -X GET http://localhost:3000/api/files/starred \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns array of starred files with additional metadata:
- `isStarred`: Boolean (always true for this endpoint)
- `lastViewedAt`: ISO timestamp of last view
- `lastEditedAt`: ISO timestamp of last edit (or null)
- `lastInteractionType`: "VIEW" or "EDIT"

4.3 Get Recently Accessed Files
```Bash
curl -i -X GET http://localhost:3000/api/files/recent \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns up to 20 recently accessed files, sorted by most recent interaction first.
Each file includes metadata about when and how it was accessed:
- `lastViewedAt`: Timestamp of last GET request
- `lastEditedAt`: Timestamp of last PATCH request
- `lastInteractionType`: "VIEW" (from GET) or "EDIT" (from PATCH)
- `isStarred`: Whether the file is currently starred

**Important**: Only **files** (docs, pdf, image) appear in the recent list. **Folders** are excluded even if viewed or modified, keeping the list focused on actual document activity.

**Automatic Tracking**: File interactions are automatically recorded when you:
- GET `/api/files/:id` - Records a VIEW interaction (files only)
- PATCH `/api/files/:id` - Records an EDIT interaction (files only)

**User Isolation**: Starred and recent file lists are per-user. Each user maintains their own separate list.

### 5. File Operations: Copy & Shared

5.1 Copy a File or Folder
```Bash
# Copy with default name "Copy of <original name>"
curl -i -X POST http://localhost:3000/api/files/<FILE_ID>/copy \
     -H "Authorization: Bearer <TOKEN>"

# Copy with custom name and/or parent folder
curl -i -X POST http://localhost:3000/api/files/<FILE_ID>/copy \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"newName":"My Copy.txt","parentId":"<TARGET_FOLDER_ID>"}'
```
Expected Response: 201 Created. Header Location contains the new file ID. Body contains the copied file metadata.

**Copy Behavior**:
- **Ownership**: The user performing the copy becomes the OWNER of the new file/folder
- **Permissions**: The new file starts clean (no inherited permissions from source)
- **Content**: For files, content is duplicated from storage server
- **Deep Copy**: For folders, all accessible children are recursively copied
- **Requirements**: User must have at least VIEWER permission on source file

5.2 Get Shared Files
```Bash
curl -i -X GET http://localhost:3000/api/files/shared \
     -H "Authorization: Bearer <TOKEN>"
```
Expected Response: 200 OK. Returns all files/folders where:
- The user has **DIRECT** VIEWER or EDITOR permission (not inherited from parent folders)
- The user is NOT the owner

Each file includes `sharedPermissionLevel` field showing the user's permission level.

**Important**: Only directly shared files/folders appear in this list. Files accessible through inherited permissions (e.g., child files in a shared folder) are NOT included. This keeps the "Shared with me" view clean and focused on explicitly shared items.

**Example**: 
- User A shares Folder X with User B → Folder X appears in User B's "Shared with me"
- Folder X contains File Y (owned by User A) → File Y does NOT appear in User B's "Shared with me" (inherited access only)
- User A directly shares File Y with User B → Now File Y appears in "Shared with me"

**Use Case**: This endpoint is perfect for a "Shared with me" view in a file manager UI.

---

## Project Execution Demo: Complete API Walkthrough

This section provides a visual, step-by-step demonstration of the entire OverDrive system lifecycle, from user registration to collaborative file management with permissions.

### 1. User Registration & Conflict Handling
**POST /api/users** - Creating users Alicia and Robert with Gmail validation (6-30 character usernames). The system enforces duplicate prevention, returning **409 Conflict** when attempting to register an existing email.

![User Registration](Images/1.png)

---

### 2. Authentication & Profile Retrieval
**POST /api/tokens** - Users authenticate and receive a unique `user-id` for session management. **GET /api/users/:id** - Verifying that user data (username, firstName, lastName) is correctly stored and retrieved.

![Authentication](Images/2.png)

---

### 3. File Hierarchy Creation
**POST /api/files** - Alicia creates a folder named "Work_Project" and then uploads a file "notes.txt" inside it using `parentId` to establish the hierarchy.

![Folder and File Creation](Images/3.png)

---

### 4. Root-Level Files & Listing
**POST /api/files** - Alicia creates "readme.txt" at the root level (no parent). **GET /api/files** - Listing all files and folders to verify the current structure.

![File Listing](Images/4.png)

---

### 5. File Updates - Name & Content
**PATCH /api/files/:id** - Alicia renames "notes.txt" to "important_notes.txt" and then updates its content to text starting with "ZZZZZZZZZ". Both operations return **204 No Content**.

![File Updates](Images/5.png)

---

### 6. File Movement & Search Initialization
**PATCH /api/files/:id** - Moving "important_notes.txt" from "Work_Project" to root by setting `parentId` to `null`. Introduction to **GET /api/search/:query** for content-based searching.

![File Movement](Images/6.png)

---

### 7. Deep Content Search in Compressed Data
**GET /api/search/:query** - Demonstrating full-text search capabilities. Searching for "ZZZZZ" finds the file with that content, and searching "OverDrive" locates the readme file. The C++ backend performs decompression on-the-fly for content matching.

![Content Search](Images/7.png)

---

### 8. Access Control & Permission Granting
**GET /api/files/:id** - Robert attempts to access Alicia's file and receives **403 Forbidden**. **GET /api/files/:id/permissions** - Alicia checks current permissions. **POST /api/files/:id/permissions** - Alicia grants Robert **VIEWER** access (**201 Created**).

![Access Control](Images/8.png)

---

### 9. Authorized Access & Permission Upgrade
**GET /api/files/:id** - Robert successfully reads the file content with his VIEWER permission. **PATCH /api/files/:id/permissions/:pId** - Alicia upgrades Robert from **VIEWER** to **EDITOR** (**204 No Content**).

![Permission Upgrade](Images/9.png)

---

### 10. Collaborative Editing & Final State
**PATCH /api/files/:id** - Robert (now an EDITOR) modifies the file content to "Guest modified this content". **GET /api/files/:id/permissions** - Final verification shows Alicia as **OWNER** and Robert as **EDITOR**, demonstrating full RBAC functionality.

![Collaborative Editing](Images/10.png)

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


## The system performs a dual search on both file names and content, with filtering:

1. Metadata Search – The Web Server searches for files and folders by name, limited to those the user has access to.
2. Content Search – Requests for content search are sent to the C++ Storage Server. Since the server may return IDs of irrelevant files (due to its internal ID system), results are filtered to include only files the user can access. An additional check is performed on the file content to confirm a real match, and any non-matching files are discarded.

---

## Known Limitations

- Gmail Restriction:
     
     Only @gmail.com addresses are allowed for registration.
     
     Username requirements: Must be between 6–30 characters.
     
     If the user enters the username without @gmail.com, it is automatically appended.
     
     Normalization is applied: dots (.) and uppercase letters are ignored or converted to lowercase.

- Password Requirements:
     
     Minimum 8 characters.
     
     Must contain both letters (a-z, A-Z) and numbers (0-9).
     
     Applies to both registration and password updates.

- In-Memory Users: User data resets on Web Server restart (unless persistent store is attached).
- Search Case-Sensitivity: Search is currently case-sensitive.

---

## License

This project is part of an academic exercise in Advanced Systems Programming.
