#ifndef IEXECUTOR_H
#define IEXECUTOR_H

#include <string>
#include <vector>
#include <map>
#include "ICommand.h"
#include "CommandResult.h"

class IExecutor {
private:
    std::map<std::string, ICommand*> commands; 

public:
    // Constructor: inject dependencies
    IExecutor(std::map<std::string, ICommand*> commands);
    virtual CommandResult execute(const std::vector<std::string>& args) = 0;
    virtual ~IExecutor() = default;
};

#endif // IEXECUTER_H
