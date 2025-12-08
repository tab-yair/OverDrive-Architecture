#ifndef POSTCOMMAND_H
#define POSTCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"
#include "handlers/ClientContext.h"

// The PostCommand class implements the 'post' command.
// It creates a new file and writes the RLE-compressed version of the input text into it.
// Expected usage: post [file_name] [text]
class PostCommand : public ICommand {
private:
    std::shared_ptr<IFileManagement> fileManager;
    std::shared_ptr<ClientContext> clientContext;

public:
    // Constructor receives dependencies for file handling and client context
    PostCommand(std::shared_ptr<IFileManagement> fileManager, std::shared_ptr<ClientContext> context);

    // Executes the 'post' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~PostCommand() = default;


};

#endif // POSTCOMMAND_H