import socket
import sys

# Define a reasonable timeout duration in seconds
# This is necessary because the content length is unknown and the connection is persistent.
SOCKET_TIMEOUT = 0.5 

class SocketClientComm:
    """
    Handles persistent TCP communication with the server using a line-based protocol.
    Reads multi-line responses by relying on a short socket timeout to mark the end
    of a complete message block.
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
        self.file_stream = None
        
        try:
            # Connect to the server
            self.socket.connect((server_ip, port))
            self.connected = True
            
            # Set a short timeout in order to reliably read an unknown length, multi-line response on a persistent connection.
            self.socket.settimeout(SOCKET_TIMEOUT) 
            
            # Create a file-like object for easier line-by-line reading
            self.file_stream = self.socket.makefile('rb')
            
        except Exception as e:
            raise ConnectionError(f"Failed to connect to server: {e}")
    
    def receive(self):
        """
        Receives the full response data from the server.
        
        It reads line-by-line in a loop until a timeout occurs, signifying that
        the server has finished sending the complete response block (Status + Content).
        
        Returns:
            str: The fully received response, or an empty string on error/disconnect.
        """
        if not self.connected or not self.file_stream:
            return ""
        
        full_response_bytes = []
        
        try:
            # Read all incoming data line-by-line until the socket blocks.
            while True:
                # self.file_stream.readline() will block until \n or timeout
                response_line_bytes = self.file_stream.readline()
                
                if not response_line_bytes:
                    # EOF: Server closed the connection
                    self.connected = False
                    break

                full_response_bytes.append(response_line_bytes)
                
        except socket.timeout:
            # Expected behavior: The server has finished sending the full message block.
            pass
        except Exception:
            # Handle other communication errors
            self.connected = False
        
        if not full_response_bytes:
            # If nothing was received, return an empty string
            return ""
            
        # Join all the received bytes and decode to a single string
        return b"".join(full_response_bytes).decode('utf-8')
    
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
        print(message, end='')


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
