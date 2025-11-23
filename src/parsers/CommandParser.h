#ifndef COMMANDPARSING_H
#define COMMANDPARSING_H

#include "IParser.h"
#include "ParsedCommand.h"
#include <string>
#include <vector>
#include <sstream>

class CommandParser : public IParser {
    public:
        // function to parse a command string into ParsedCommand struct
        ParsedCommand parse(const std::string& input);
};


#endif // COMMANDPARSING_H