#ifndef CONSOLEMENU_H
#define CONSOLEMENU_H

#include "IMenu.h"
#include "CommandParser.h"
#include "ParsedCommand.h"
#include <iostream>  

class ConsoleMenu : public IMenu {
    public:
        ConsoleMenu();
        // Override nextCommand to get user input from console
        std::string nextCommand() override;

        int handleOutput(std::string output) override;
};


#endif // CONSOLEMENU_H