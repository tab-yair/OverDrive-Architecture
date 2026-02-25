# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for React environment variables
ARG REACT_APP_API_BASE_URL=http://localhost:3000
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Clean webpack cache to ensure fresh build
RUN rm -rf node_modules/.cache

# Build the React app
RUN npm run build

# Production stage - serve with Node.js
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from build stage
COPY --from=build /app/build ./build

# Expose port 3001
EXPOSE 3001

# Start serve on port 3001
# -s flag enables single-page application mode (all routes serve index.html)
CMD ["serve", "-s", "build", "-l", "3001"]
