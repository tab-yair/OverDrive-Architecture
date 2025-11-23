#ifndef IPARSER_H
#define IPARSER_H

#include "parsers/ParsedCommand.h"
#include <string>

class IParser {
    public:
        // function to parse a command string into ParsedCommand struct
        virtual ParsedCommand parse(const std::string& input) = 0;

        virtual ~IParser() = default; 
};

#endif // IPARSER_H
