#ifndef ADDCOMMAND_H
#define ADDCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include <optional>
#include "ICommand.h"
#include "../file/IFileManagement.h"

// The AddCommand class implements the 'add' command.
// It creates a new file and writes the RLE-compressed version of the input text into it.
// Expected usage: add [file_name] [text]
class AddCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling
    AddCommand(std::shared_ptr<IFileManager> fileManager);

    // Executes the 'add' command with the given arguments
    virtual std::optional<std::string> execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~AddCommand() = default;

private:
    std::shared_ptr<IFileManager> fileManager;
};

#endif // ADDCOMMAND_H
