#ifndef CONSOLEMENU_H
#define CONSOLEMENU_H

#include "IMenu.h"
#include <iostream>  

class ConsoleMenu : public IMenu {
    public:
        // Override nextCommand to get user input from console
        std::vector<std::string> nextCommand() override;
    private:
        // function to parse a command string into command [0] and arguments [1]
        std::vector<std::string> parseCommand(const std::string& input);
};


#endif // CONSOLEMENU_H