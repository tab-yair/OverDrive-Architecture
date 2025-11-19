#ifndef APP_H
#define APP_H

#include <map>
#include "IMenu.h"
#include "ICommand.h"
#include "IExecutor.h"
#include "ParsedCommand.h"
#include "IParser.h"

class App {
private:
    IMenu* menu;
    IExecutor* executor;
    IParser* parser;

public:
    // Constructor: inject dependencies
    App(IMenu* menu, IExecutor* executor, IParser* parser);
    
    // Main application loop
    void run();
    
};

#endif