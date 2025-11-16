# --- Builder stage ---
FROM gcc:latest AS builder
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    wget \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . /src

# Clean build
RUN rm -rf build

# Configure and build
RUN mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . --clean-first -- -j$(nproc)

# --- Runtime stage ---
FROM gcc:latest AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy binaries
COPY --from=builder /src/build/bin /app/bin
ENV PATH="/app/bin:${PATH}"

# Set default OverDrive path for file operations
ENV OVERDRIVE_PATH=/app/files

# Default: run all tests (adjust if needed)
CMD ["bash", "-c", "for t in /app/bin/*; do echo Running $t; $t; done"]
