#ifndef SEARCHCOMMAND_H
#define SEARCHCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"

// The SearchCommand class implements the 'search' command.
// It searches for the specified text in all files and returns a list of filenames containing that text
class SearchCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling
    SearchCommand(std::shared_ptr<IFileManagement> fileManager);

    // Executes the 'search' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~SearchCommand() = default;

private:
    std::shared_ptr<IFileManagement> fileManager;
};

#endif // SEARCHCOMMAND_H
