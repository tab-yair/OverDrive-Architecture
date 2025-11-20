#include "App.h"

App::App(IMenu* menu, IExecutor* executor, IParser* parser) : menu(menu), executor(executor), parser(parser) {}

// The flow of the application: Menu → Parser → Executor (Command) → Menu (OutputHandler)

void App::run() {
    while (true) {
        // Get the next command + arguments from the menu
        std::string unparsedCommand = menu->nextCommand();
        // Parse the command string into command name and arguments
        ParsedCommand command = parser->parse(unparsedCommand);
        
        //Declare variable outside try block to be used afterwards
        std::optional<std::string> output;
        try {
            // Call the execute method of the executor with name and arguments
            output = executor->execute(command.name,command.args);
        }
        catch(...){
            //!!  how to ignore invalid input
            continue;
        }

        if (output.has_value()) {
            // Output to handle
            int outputResult = menu->handleOutput(output.value());
            if (outputResult == -1) {
                //!! Error in output handling, for now ignored
            }
        }


    }
}