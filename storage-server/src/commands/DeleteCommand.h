#ifndef DELETECOMMAND_H
#define DELETECOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"

// The DeleteCommand class implements the 'delete' command.
// It deletes the specified file from the server.
// Expected usage: delete [file_name]
class DeleteCommand : public ICommand {
private:
    std::shared_ptr<IFileManagement> fileManager;

public:
    // Constructor receives dependencies for file handling
    DeleteCommand(std::shared_ptr<IFileManagement> fileManager);

    // Executes the 'delete' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~DeleteCommand() = default;
    
};

#endif // DELETECOMMAND_H