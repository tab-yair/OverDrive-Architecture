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

# Clean and build
RUN rm -rf build
RUN mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . --clean-first -- -j$(nproc)

# --- Runtime stage ---
FROM gcc:latest AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy ONLY the main application
COPY --from=builder /src/build/overdrive_main_app /app/overdrive_main_app

ENV OVERDRIVE_PATH=/app/files
RUN mkdir -p /app/files

# Run the main application
CMD ["/app/overdrive_main_app"]