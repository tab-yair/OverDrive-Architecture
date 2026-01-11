const net = require('net');

// Connection pool for reusing TCP connections
class ConnectionPool {
    constructor(host, port, poolSize = 5) {
        this.host = host;
        this.port = port;
        this.poolSize = poolSize;
        this.availableConnections = [];
        this.activeConnections = new Set();
        this.waitingQueue = [];
    }

    // Create a new connection
    createConnection() {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setKeepAlive(true, 60000);

            socket.connect(this.port, this.host, () => {
                resolve(socket);
            });

            socket.on('error', (err) => {
                reject(new Error(`Connection error: ${err.message}`));
            });
        });
    }

    // Get connection from pool or create new one
    async acquire() {
        // Try to get available connection
        if (this.availableConnections.length > 0) {
            const conn = this.availableConnections.pop();
            
            // Check if connection is still alive
            if (conn.destroyed || !conn.writable) {
                return this.acquire(); // Try again with next connection
            }
            
            this.activeConnections.add(conn);
            return conn;
        }

        // Create new connection if under pool size
        if (this.activeConnections.size < this.poolSize) {
            try {
                const conn = await this.createConnection();
                this.activeConnections.add(conn);
                return conn;
            } catch (error) {
                throw error;
            }
        }

        // Wait for a connection to be released
        return new Promise((resolve) => {
            this.waitingQueue.push(resolve);
        });
    }

    // Release connection back to pool
    release(conn) {
        this.activeConnections.delete(conn);

        // If someone is waiting, give them this connection
        if (this.waitingQueue.length > 0) {
            const resolve = this.waitingQueue.shift();
            this.activeConnections.add(conn);
            resolve(conn);
            return;
        }

        // Otherwise, return to available pool
        if (!conn.destroyed && conn.writable) {
            this.availableConnections.push(conn);
        }
    }

    // Close all connections
    async closeAll() {
        const allConnections = [
            ...this.availableConnections,
            ...this.activeConnections
        ];

        for (const conn of allConnections) {
            if (!conn.destroyed) {
                conn.destroy();
            }
        }

        this.availableConnections = [];
        this.activeConnections.clear();
        this.waitingQueue = [];
    }
}

// TCP client for storage-server using command-line protocol
// Handles POST, GET, DELETE, SEARCH operations to C++ server
class StorageServerClient {
    constructor(host = 'localhost', port = 5555, poolSize = 5) {
        this.host = host;
        this.port = port;
        this.pool = new ConnectionPool(host, port, poolSize);
    }

    // Send command to storage server using pooled connection
    async sendCommand(command) {
        let connection = null;
        
        try {
            connection = await this.pool.acquire();
            
            return await new Promise((resolve, reject) => {
                let responseData = '';
                let timeout;

                const cleanup = () => {
                    if (timeout) clearTimeout(timeout);
                    connection.removeAllListeners('data');
                    connection.removeAllListeners('error');
                };

                // Set timeout
                timeout = setTimeout(() => {
                    cleanup();
                    // Don't release - connection is probably broken
                    connection.destroy();
                    reject(new Error('Storage server request timeout'));
                }, 10000);

                // Handle response data
                const dataHandler = (data) => {
                    responseData += data.toString();
                    
                    // Check if we have a full response (ends with \n)
                    // Important: Must check endsWith, not includes, because JSON-escaped 
                    // content may contain literal "\\n" characters (two chars: \ + n)
                    if (responseData.endsWith('\n')) {
                        cleanup();
                        this.pool.release(connection);
                        
                        // Remove trailing \n added by C++ send()
                        const message = responseData.slice(0, -1);
                        
                        // Protocol: "STATUS TEXT\n\nCONTENT\n" or "STATUS TEXT\n"
                        const separatorIndex = message.indexOf('\n\n');
                        
                        let statusLine, content;
                        if (separatorIndex !== -1) {
                            // Has content
                            statusLine = message.substring(0, separatorIndex);
                            content = message.substring(separatorIndex + 2); // +2 to skip \n\n
                        } else {
                            // No content (only status with possible single \n)
                            statusLine = message.replace(/\n$/, '');
                            content = undefined;
                        }
                        
                        // Parse status code
                        const statusCode = parseInt(statusLine);
                        
                        console.log('[DEBUG] storageClient response:', {
                            statusCode,
                            statusLine,
                            hasContent: content !== undefined,
                            contentLength: content ? content.length : 0,
                            firstChars: content ? content.substring(0, 100) : 'N/A',
                            lastChars: content ? content.substring(content.length - 100) : 'N/A'
                        });
                        
                        if (!isNaN(statusCode)) {
                            resolve({
                                success: statusCode >= 200 && statusCode < 300,
                                status: statusCode,
                                statusText: statusLine.replace(/^\d+\s*/, '') || "OK",
                                data: content
                            });
                        }
                    }
                };

                // Handle errors
                const errorHandler = (err) => {
                    cleanup();
                    connection.destroy();
                    reject(new Error(`Storage server error: ${err.message}`));
                };

                connection.on('data', dataHandler);
                connection.on('error', errorHandler);

                // Send command
                try {
                    // PROTOCOL NOTE: Commands are line-based (\n delimited)
                    // File content is JSON-encoded to handle special characters
                    connection.write(command + '\n');
                } catch (err) {
                    cleanup();
                    connection.destroy();
                    reject(new Error(`Failed to send command: ${err.message}`));
                }
            });
        } catch (error) {
            if (connection) {
                connection.destroy();
            }
            throw error;
        }
    }

    // Close all connections in pool
    async close() {
        await this.pool.closeAll();
    }

    // POST - Save file to server
    // Content is JSON-encoded to handle special characters (newlines, etc.)
    async post(fileId, content) {
        // Convert to string if buffer
        const textContent = Buffer.isBuffer(content)
            ? content.toString('utf-8')
            : content;
        
        // Use JSON.stringify to handle all escaping automatically
        // This properly escapes newlines, quotes, backslashes, etc.
        const escapedContent = JSON.stringify(textContent);
        
        const command = `POST ${fileId} ${escapedContent}`;

        return await this.sendCommand(command);
    }

    // GET - Retrieve file from server
    // Content is JSON-decoded to restore original format
    async get(fileId) {
        const command = `GET ${fileId}`;
        const response = await this.sendCommand(command);
        
        // Parse JSON content if present
        if (response.success && response.data) {
            try {
                // Use JSON.parse to restore original content
                // This handles all escaped characters automatically
                response.data = JSON.parse(response.data);
            } catch (err) {
                console.warn(`Failed to unescape content for ${fileId}: ${err.message}`);
            }
        }
        
        return response;
    }

    // DELETE - Remove file from server
    async delete(fileId) {
        const command = `DELETE ${fileId}`;
        return await this.sendCommand(command);
    }

    // SEARCH - Search for files on server
    async search(query) {
        const command = `SEARCH ${query}`;
        return await this.sendCommand(command);
    }

}

// Create singleton instance
const storageClient = new StorageServerClient(
    process.env.STORAGE_SERVER_HOST || 'storage-server', 
    parseInt(process.env.STORAGE_SERVER_PORT || '5555'),
    parseInt(process.env.STORAGE_SERVER_POOL_SIZE || '5')
);

// Graceful shutdown - close all connections
process.on('SIGINT', async () => {
    await storageClient.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await storageClient.close();
    process.exit(0);
});

module.exports = { StorageServerClient, storageClient };
