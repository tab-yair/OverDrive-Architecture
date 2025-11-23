# OneDrive

OverDrive is a command-line compression system implemented in C++.

The project follows principles of clean architecture, SOLID, and extensibility - designed to support future expansion with minimal changes.


### Supported Commands:

| Command                  | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `add [file_name] [text]` | Compresses the given text using RLE and saves it into the specified file.          |
| `get [file_name]`        | Decompresses the file and prints its original content.                             |
| `search [text]`          | Returns a list of file names whose content contains the given text.                |

notes:
* Commands are read from stdin.
* The program never terminates unless the container stops.
* Invalid commands are handled silently.
* All compressed files are stored under: /app/files

## Running the Project:
No need to install C++, CMake, or test frameworks locally. Everything is built and run inside Docker.

1. Build the Docker image
```bash
docker build -t overdrive .
```

2. (Optional) Run all tests:
The Docker image is configured so that running the container without arguments automatically runs all tests.
```bash 
docker run --rm overdrive
```

3. Running the Application

On Linux / Mac / Git Bash:
```bash
docker run -it --rm -v "$(pwd)/files:/app/files" overdrive /app/bin/OverDrive
```

On Windows PowerShell:
```bash
docker run -it --rm -v ${PWD}/files:/app/files overdrive /app/bin/OverDrive
```

On Windows Command Prompt (CMD):
```bash
docker run -it --rm -v %cd%\files:/app/files overdrive /app/bin/OverDrive
```