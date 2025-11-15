#ifndef STRINGUTILS_H
#define STRINGUTILS_H


#include <string>
#include <vector>

class StringUtils{
    public:
        // function to parse a command string into command [0] and arguments [1]
        static std::vector<std::string> parseCommand(const std::string& input);
};


#endif // STRINGUTILS_H