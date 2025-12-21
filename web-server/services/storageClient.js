import net from 'net';

// TCP client for storage-server using command-line protocol
// Handles POST, GET, DELETE, SEARCH operations to C++ server
class StorageServerClient {
    constructor(host = 'localhost', port = 8080) {
        this.host = host;
        this.port = port;
    }

    // Send command to storage server in command-line format
    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let responseData = '';

            // Connect to server
            client.connect(this.port, this.host, () => {
                console.log(`Connected to storage-server at ${this.host}:${this.port}`);
                
                // Send command
                client.write(command + '\n');
            });

            // Receive response from server
            client.on('data', (data) => {
                responseData += data.toString();
            });

            // Connection closed
            client.on('close', () => {
                try {
                    // Parse response as JSON
                    const response = JSON.parse(responseData);
                    resolve(response);
                } catch (error) {
                    // Return raw text if not JSON
                    resolve({ success: true, data: responseData });
                }
            });

            // Error handling
            client.on('error', (err) => {
                reject(new Error(`Storage server error: ${err.message}`));
            });

            // Timeout to prevent infinite wait
            client.setTimeout(10000, () => {
                client.destroy();
                reject(new Error('Storage server request timeout'));
            });
        });
    }

    // POST - Save file to server
    async post(fileId, content, metadata = {}) {
        // Encode content to base64
        const encodedContent = Buffer.isBuffer(content) 
            ? content.toString('base64') 
            : Buffer.from(content).toString('base64');

        const metadataStr = JSON.stringify(metadata);
        const command = `POST ${fileId} ${encodedContent} ${metadataStr}`;
        
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
    async search(query, filters = {}) {
        const filtersStr = JSON.stringify(filters);
        const command = `SEARCH ${query} ${filtersStr}`;
        return await this.sendCommand(command);
    }

    // Check connection to server
    async ping() {
        try {
            const command = 'PING';
            const response = await this.sendCommand(command);
            return response.success === true;
        } catch (error) {
            return false;
        }
    }
}

// Create singleton instance
const storageClient = new StorageServerClient(
    process.env.STORAGE_SERVER_HOST || 'localhost',
    parseInt(process.env.STORAGE_SERVER_PORT || '8080')
);

export { StorageServerClient, storageClient };
