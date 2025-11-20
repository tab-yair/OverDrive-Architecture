#ifndef IMENU_H
#define IMENU_H

#include <string>
#include <vector>
#include <optional>

#include "IParser.h"

class IMenu {
    protected:
        IParser* parser;
    public:
        IMenu(IParser* parser);
        // Pure virtual function to get the next command from the user
        virtual std::string nextCommand() = 0;
        // Pure virtual function to handle output
        virtual int handleOutput(std::string output) = 0;

};


#endif // IMENU_H