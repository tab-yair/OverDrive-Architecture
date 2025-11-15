#include "StringUtils.h"

//function to parse a command string into command [0] and arguments [1]
std::vector<std::string> StringUtils::parseCommand(const std::string& input) {
    std::vector<std::string> result(2);

    // Error: input is empty or starts with a space → return empty command and arguments
    if (input.empty() || ( !input.empty() && input[0] == ' ')) {
        result[0] = "";
        result[1] = "";
        return result;
    }

    size_t spacePos = input.find(' ');

    if (spacePos != std::string::npos) {
        result[0] = input.substr(0, spacePos);     // command
        result[1] = input.substr(spacePos + 1);    // arguments
    } else {
        result[0] = input; // command only
        result[1] = "";    // no arguments
    }

    return result;
}