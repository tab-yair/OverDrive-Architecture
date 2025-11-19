#include "App.h"

App::App(IMenu* menu, IExecutor* executor, IParser* parser) : menu(menu), executor(executor), parser(parser) {}

// The flow of the application: Menu → Parser → Executor (Command) → Menu (OutputHandler)

void App::run() {
    while (true) {
        // Get the next command + arguments from the menu
        std::string unparsedCommand = menu->nextCommand();
        // Parse the command string into command name and arguments
        ParsedCommand cRes = CommandParser::parseCommand(unparsedCommand);
        try {
            // Call the execute method of the executor with name and arguments
            std::optional<std::string> output = executor->execute(cRes.name,cRes.args);
        }
        catch(...){
            //!!  how to ignore invalid input
        }
        int outputResult = menu->handleOutput(output);

    }
}