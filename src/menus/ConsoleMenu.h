#ifndef CONSOLEMENU_H
#define CONSOLEMENU_H

#include "IMenu.h"
#include "StringUtils.h"
#include <iostream>  

class ConsoleMenu : public IMenu {
    public:
        // Override nextCommand to get user input from console
        std::vector<std::string> nextCommand() override;
};


#endif // CONSOLEMENU_H