#ifndef GETCOMMAND_H
#define GETCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include <optional>
#include "ICommand.h"
#include "../FileManagement/IFileManager.h"

// The GetCommand class implements the 'get' command.
// It creates a new file and writes the RLE-compressed version of the input text into it.
// Expected usage: get [file_name]
class GetCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling
    GetCommand(std::shared_ptr<IFileManager> fileManager);

    // Executes the 'get' command with the given arguments
    virtual std::optional<std::string> execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~GetCommand() = default;

private:
    std::shared_ptr<IFileManager> fileManager;
};

#endif // GETCOMMAND_H