#include "ConsoleMenu.h"


std::vector<std::string> ConsoleMenu::nextCommand() {
    std::string input;
    std::getline(std::cin, input);
    // Use the injected parser to parse the input
    return parser->parse(input);
}

int ConsoleMenu::handleOutput(std::string output) {
    std::cout << output << std::endl;
    return 0;
}
