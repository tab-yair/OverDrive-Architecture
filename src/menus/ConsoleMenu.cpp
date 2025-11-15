#include "ConsoleMenu.h"


std::vector<std::string> ConsoleMenu::nextCommand() {
    std::string input;
    std::getline(std::cin, input);
    //Parse the input command into command[0] and arguments[1]
    std::vector<std::string> commandParts = StringUtils::parseCommand(input);
    return commandParts;
}
