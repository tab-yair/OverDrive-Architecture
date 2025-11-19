#ifndef PARSEDCOMMAND_H
#define PARSEDCOMMAND_H
#include <string>
#include <optional>
#include <vector>

struct ParsedCommand {
    std::string name;
    std::vector<std::string> args;
};

#endif // PARSEDCOMMAND_H