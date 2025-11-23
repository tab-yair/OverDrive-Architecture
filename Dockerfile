# --- Builder stage ---
FROM gcc:latest AS builder
ENV DEBIAN_FRONTEND=noninteractive

# התקנת build tools
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

# Configure and build everything
RUN mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . --clean-first -- -j$(nproc)

# --- Runtime stage ---
FROM gcc:latest AS runtime
WORKDIR /app

# צור תיקייה לקבצים של OVERDRIVE
RUN mkdir -p /app/files

# התקנת CA certificates בלבד (ריצה מינימלית)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# העתק רק את ה-executables (הספריות נשארות ב-builder)
COPY --from=builder /src/build/bin /app/bin

# PATH ותיקיית OverDrive
ENV PATH="/app/bin:${PATH}"
ENV OVERDRIVE_PATH=/app/files

# ברירת מחדל: הרץ את כל הטסטים
CMD ["bash", "-c", "for t in /app/bin/*; do echo Running $t; $t || true; done"]