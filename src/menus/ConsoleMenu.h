#ifndef CONSOLEMENU_H
#define CONSOLEMENU_H

#include "menus/IMenu.h"
#include "parsers/CommandParser.h"
#include "parsers/ParsedCommand.h"
#include <iostream>  

class ConsoleMenu : public IMenu {
    public:
        ConsoleMenu();
        // Override nextCommand to get user input from console
        std::string nextCommand() override;

        int handleOutput(std::string output) override;
};


#endif // CONSOLEMENU_H