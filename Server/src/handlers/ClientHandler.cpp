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
        std::string unparsedCommand = comm->recive();
        // Parse the command string into command name and arguments
        ParsedCommand command = parser->parse(unparsedCommand);
        
        //Declare variable outside try block to be used afterwards
        CommandResult result(CommandResult::Status::BAD_REQUEST);
        try {
            // Call the execute method of the executor with name and arguments
            result = executor->execute(command.name, command.args);
        }
        catch(...){
            //!!  how to ignore invalid input
            continue;
        }

        // Send output if there is content
        if (!result.content.empty()) {
            int sendResult = comm->send(result.content);
            if (sendResult == -1) {
                //!! Error in send handling, for now ignored
            }
        }


    }
}