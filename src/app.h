#ifndef APP_H
#define APP_H

#include <map>
#include "IMenu.h"
#include "ICommand.h"

class App {
private:
    IMenu* menu;
    std::map<std::string, ICommand*> commands; 

public:
    // Constructor: inject dependencies
    App(IMenu* menu, std::map<std::string, ICommand*> commands);
    
    // Main application loop
    void run();
    
    // do we need Destructor ? what about pointer cleanup ?
};

#endif