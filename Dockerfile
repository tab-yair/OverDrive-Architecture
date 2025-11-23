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

# Copy test binaries (but not the main app)
COPY --from=builder /src/build/bin /app/bin

# Copy main app to separate location (if exists, for manual running)
RUN if [ -f /src/build/overdrive_main_app ]; then \
    cp /src/build/overdrive_main_app /app/overdrive_main_app; \
    fi || true

ENV PATH="/app/bin:${PATH}"
ENV OVERDRIVE_PATH=/app/files
RUN mkdir -p /app/files

# Default: run all tests
CMD ["bash", "-c", "for t in /app/bin/*; do echo '=== Running' $t '==='; $t && echo 'PASSED' || echo 'FAILED'; echo; done"]