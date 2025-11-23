#ifndef APP_H
#define APP_H

#include <map>
#include <memory>
#include "IMenu.h"
#include "ICommand.h"
#include "IExecutor.h"
#include "ParsedCommand.h"
#include "IParser.h"

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