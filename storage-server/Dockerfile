# Build Stage
FROM gcc:11 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libssl-dev \
    nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy all source files
COPY . .

# Build the project
RUN cmake . && make server_main

# Run Stage
FROM gcc:11

# Install runtime dependencies (already has libstdc++, just need openssl)
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create storage directory and set Env
RUN mkdir -p /app/files && chmod 777 /app/files
ENV OVERDRIVE_PATH=/app/files

# COPY the executable. 
# NOTE: Assuming CMake outputs the binary named 'server_main' to the root or Server folder.
# If your binary is named differently (e.g. 'server'), change 'server_main' below.
COPY --from=builder /app/server_main .

# The port is passed as an argument
ENTRYPOINT ["./server_main"]