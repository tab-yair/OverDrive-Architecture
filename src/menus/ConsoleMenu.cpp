#include "menus/ConsoleMenu.h"

ConsoleMenu::ConsoleMenu() {}

std::string ConsoleMenu::nextCommand() {
    std::string input;
    std::getline(std::cin, input);
    return input;
}

int ConsoleMenu::handleOutput(std::string output) {
    std::cout << output << std::endl;
    return 0;
}
