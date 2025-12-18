#ifndef GETCOMMAND_H
#define GETCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"

// The GetCommand class implements the 'get' command.
// It retrieves the content of a file.
// Expected usage: get [file_name]
class GetCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling
    GetCommand(std::shared_ptr<IFileManagement> fileManager);

    // Executes the 'get' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;
    virtual ~GetCommand() = default;

private:
    std::shared_ptr<IFileManagement> fileManager;
};

#endif // GETCOMMAND_H