import net from 'net';

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
    constructor(host = 'localhost', port = 8080, poolSize = 5) {
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
                    
                    // Server protocol: "STATUS\n" or "STATUS\n\nCONTENT\n"
                    // Status codes that NEVER return content: 204, 404, 400
                    // Status codes that MAY return content: 200, 201
                    //
                    // IMPORTANT: ClientServerComm::send() adds \n and sends the ENTIRE
                    // message (including final \n) atomically via a while loop.
                    // Therefore, if responseData.endsWith('\n'), the COMPLETE message
                    // has been received (no partial body possible).
                    
                    if (responseData.includes('\n')) {
                        const lines = responseData.split('\n');
                        const firstLine = lines[0];
                        
                        // Check for valid status line (e.g., "200 OK", "404 Not Found")
                        const statusMatch = firstLine.match(/^(\d+)\s+(.+)$/);
                        
                        if (statusMatch) {
                            const statusCode = parseInt(statusMatch[1]);
                            const statusText = statusMatch[2];
                            
                            // Determine if this status expects content
                            const expectsNoContent = [204, 404, 400].includes(statusCode);
                            
                            if (expectsNoContent && responseData.endsWith('\n')) {
                                // Status-only response - complete when ends with \n
                                cleanup();
                                const success = statusCode >= 200 && statusCode < 300;
                                
                                this.pool.release(connection);
                                resolve({
                                    success,
                                    status: statusCode,
                                    statusText,
                                    data: undefined
                                });
                            } else if (!expectsNoContent && responseData.includes('\n\n') && responseData.endsWith('\n')) {
                                // Response with content - complete when has \n\n and ends with \n
                                cleanup();
                                
                                const trimmed = responseData.trim();
                                const parts = trimmed.split('\n\n');
                                const content = parts.length > 1 ? parts.slice(1).join('\n\n') : '';
                                const success = statusCode >= 200 && statusCode < 300;
                                
                                this.pool.release(connection);
                                resolve({
                                    success,
                                    status: statusCode,
                                    statusText,
                                    data: content || undefined
                                });
                            }
                            // else: incomplete message, keep waiting
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
                    // CRITICAL: Command must NOT contain \n except at the end
                    // The C++ server's receive() uses \n as delimiter and will
                    // stop reading when it encounters one, causing protocol errors.
                    // We use base64 encoding for content to avoid this issue.
                    if (command.includes('\n')) {
                        cleanup();
                        connection.destroy();
                        reject(new Error('Command contains illegal newline character'));
                        return;
                    }
                    
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
    async post(fileId, content) {
        // Encode content to base64
        const encodedContent = Buffer.isBuffer(content) 
            ? content.toString('base64') 
            : Buffer.from(content).toString('base64');

        const command = `POST ${fileId} ${encodedContent}`;
        
        return await this.sendCommand(command);
    }

    // GET - Retrieve file from server
    async get(fileId) {
        const command = `GET ${fileId}`;
        const response = await this.sendCommand(command);
        
        // Decode from base64 if needed
        if (response.data && response.data.content) {
            response.data.content = Buffer.from(response.data.content, 'base64');
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
    process.env.STORAGE_SERVER_HOST || 'localhost',
    parseInt(process.env.STORAGE_SERVER_PORT || '8080'),
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

export { StorageServerClient, storageClient };
