# Use Node.js LTS version
FROM node:20

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy all web server source files
COPY . .

# Web server port
EXPOSE 3000

# Set environment variable
ENV NODE_ENV='production'

# Start the Node.js server
CMD ["node", "src/server.js"]