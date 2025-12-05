#include "handlers/ClientHandler.h"

// Constructor for app class, using dependency injection
ClientHandler::ClientHandler(std::unique_ptr<ICommunication> comm, 
         std::unique_ptr<IExecutor> executor,
         std::unique_ptr<IParser> parser)
    : comm(std::move(comm)),          
      executor(std::move(executor)), 
      parser(std::move(parser)) {}

// The flow of the application: Comm → Parser → Executor (Command) → Comm

void ClientHandler::run() {
    while (true) {
        // Get the next command + arguments from the communication interface
        std::string unparsedCommand = comm->recieve();
        // Parse the command string into command name and arguments
        ParsedCommand command = parser->parse(unparsedCommand);
        
        //Declare variable outside try block to be used afterwards
        CommandResult result(CommandResult::Status::BAD_REQUEST);
        try {
            // Call the execute method of the executor with name and arguments
            result = executor->execute(command.name, command.args);
        }
        catch(...){
            //!!  how to ignore invalid input/invalid ptr to command
            continue; // silently ignore invalid commands
        }

        // Send the converted result back through the communication interface
        int sent_bytes = comm->send(HTTPAdapter(result));
        if (sent_bytes < 0) {
            // Handle send error (optional)
        }

    }
}