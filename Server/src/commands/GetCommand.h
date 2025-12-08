#ifndef GETCOMMAND_H
#define GETCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"
#include "handlers/ClientContext.h"

// The GetCommand class implements the 'get' command.
// It retrieves the content of a file for a specific client.
// Expected usage: get [file_name]
class GetCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling and client context
    GetCommand(std::shared_ptr<IFileManagement> fileManager, std::shared_ptr<ClientContext> context);

    // Executes the 'get' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~GetCommand() = default;

private:
    std::shared_ptr<IFileManagement> fileManager;
    std::shared_ptr<ClientContext> clientContext;
};

#endif // GETCOMMAND_H