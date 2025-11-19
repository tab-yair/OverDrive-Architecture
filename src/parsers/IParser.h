#ifndef IPARSER_H
#define IPARSER_H

#include <string>

class IParser {
    public:
        // function to parse a command string into ParsedCommand struct
        virtual ParsedCommand parse(const std::string& input);
};

#endif // IPARSER_H
