import socket
import sys

# Socket timeout for reading complete responses from persistent connection
# Set to 500ms to accommodate variable response lengths without content-length header
SOCKET_TIMEOUT = 0.5 

class SocketClientComm:
    """
    Manages TCP socket communication with server using persistent connections.
    Response boundaries are detected via socket timeout after complete message blocks.
    """
    
    def __init__(self, server_ip, port):
        """
        Initializes the socket, sets a timeout, and connects to the server.
        
        Args:
            server_ip (str): Server IP address
            port (int): Server port number
        """
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.connected = False
        self.buffer = b''  # Buffer for partial data
        
        try:
            # Connect to the server
            self.socket.connect((server_ip, port))
            self.connected = True
            
            # Configure timeout for response boundary detection
            self.socket.settimeout(SOCKET_TIMEOUT) 
            
        except Exception as e:
            raise ConnectionError(f"Failed to connect to server: {e}")
    
    def receive(self):
        """
        Receives a single response from the server.
        
        Protocol format:
        - No content: STATUS\\n
        - With content: STATUS\\n\\nCONTENT\\n
        
        Reads until timeout (0.5s), then parses the received data.
        
        Returns:
            str: The received response formatted as "STATUS" or "STATUS\\nCONTENT",
                 or an empty string on error/disconnect.
        """
        if not self.connected:
            return ""
        
        response_data = b''
        
        try:
            # Read chunks until timeout
            while True:
                try:
                    chunk = self.socket.recv(4096)
                    if not chunk:
                        # EOF
                        if not response_data:
                            self.connected = False
                        break
                    response_data += chunk
                except socket.timeout:
                    # Timeout - response complete
                    break
                    
        except Exception:
            self.connected = False
            return ""
        
        if not response_data:
            return ""
        
        # Decode and parse response
        decoded = response_data.decode('utf-8')
        
        # Remove final newline if present
        if decoded.endswith('\n'):
            decoded = decoded[:-1]
        
        return decoded
    
    def send(self, message):
        """
        Sends the user's message to the server, appending the required newline.
        
        Args:
            message (str): Message/command to send
            
        Returns:
            int: Number of bytes sent, or -1 on error.
        """
        if not self.connected:
            return -1
        
        try:
            # Add newline as required by the protocol for command termination
            full_message = message + "\n"
            # Encode message to bytes and send
            bytes_sent = self.socket.send(full_message.encode('utf-8'))
            return bytes_sent
        except Exception:
            self.connected = False
            return -1
    
    def is_connected(self):
        """Checks if the connection is currently active."""
        return self.connected
    
    def close(self):
        """Closes the socket connection."""
        if self.socket:
            self.socket.close()
            self.connected = False

class UserClientComm:
    """Handles communication with the user via console"""
    
    @staticmethod
    def receive():
        """
        Read input from user
        
        Returns:
            str: User input
        """
        return input()
    
    @staticmethod
    def send(message):
        """
        Display message to user
        
        Args:
            message (str): Message to display
        """
        print(message)


def main():
    """Main function: connects to server and handles command loop"""
    
    # Check command line arguments
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <server_ip> <port>", file=sys.stderr)
        sys.exit(1)
    
    server_ip = sys.argv[1]
    
    try:
        port = int(sys.argv[2])
    except ValueError:
        print("Error: Port must be a number", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Create communication objects
        server_comm = SocketClientComm(server_ip, port)
        user_comm = UserClientComm()
        
        # Main loop: read from user, send to server, receive response, display to user
        while server_comm.is_connected():
            # Read command from user
            try:
                command = user_comm.receive()
            except EOFError:
                break
            
            # Send command to server
            if server_comm.send(command) <= 0:
                break
            
            # Receive response from server
            response = server_comm.receive()
            
            if not response:
                break
            
            # Display response to user
            user_comm.send(response)
        
        server_comm.close()
        
    except ConnectionError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
