#ifndef SEARCHCOMMAND_H
#define SEARCHCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"
#include "handlers/ClientContext.h"

// The SearchCommand class implements the 'search' command.
// It searches for the specified text in all files for a specific client and returns a list of filenames containing that text
class SearchCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling and client context
    SearchCommand(std::shared_ptr<IFileManagement> fileManager, std::shared_ptr<ClientContext> context);

    // Executes the 'search' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~SearchCommand() = default;

private:
    std::shared_ptr<IFileManagement> fileManager;
    std::shared_ptr<ClientContext> clientContext;
};

#endif // SEARCHCOMMAND_H
