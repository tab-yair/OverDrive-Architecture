#ifndef APP_H
#define APP_H

#include <map>
#include <memory>
#include "menus/IMenu.h"
#include "commands/ICommand.h"
#include "executors/IExecutor.h"
#include "parsers/ParsedCommand.h"
#include "parsers/IParser.h"

class App {
private:
    std::unique_ptr<IMenu> menu;
    std::unique_ptr<IExecutor> executor;
    std::unique_ptr<IParser> parser;

public:
    // Constructor: inject dependencies
    App(std::unique_ptr<IMenu> menu, 
        std::unique_ptr<IExecutor> executor,
        std::unique_ptr<IParser> parser);

    // Main application loop    
    void run();
};

#endif