#include "ConsoleMenu.h"


std::vector<std::string> ConsoleMenu::nextCommand() {
    std::string input;
    std::getline(std::cin, input);
    //Parse the input command into command[0] and arguments[1]
    std::vector<std::string> commandParts = parseCommand(input);
    return commandParts;
}

//function to parse a command string into command [0] and arguments [1]
std::vector<std::string> ConsoleMenu::parseCommand(const std::string& input) {
    std::vector<std::string> result(2);
    size_t spacePos = input.find(' ');
    if (spacePos != std::string::npos) {
        result[0] = input.substr(0, spacePos); // command
        result[1] = input.substr(spacePos + 1); // arguments
    } else {
        result[0] = input; // command
        result[1] = ""; // no arguments
    }
    return result;
}