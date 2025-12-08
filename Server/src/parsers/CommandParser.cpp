#include "parsers/CommandParser.h"

ParsedCommand CommandParser::parse(const std::string& input) {
    ParsedCommand result;
    std::istringstream iss(input);
    std::string token;

    // Get the command (first token)
    if (iss >> token) {
        result.name = token;
        for (char &c : result.name) c = toupper(c);
    }

    // Get the arguments (remaining tokens)
    while (iss >> token) {
        result.args.push_back(token);
    }

    return result;
}
