#ifndef POSTCOMMAND_H
#define POSTCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "commands/ICommand.h"
#include "file/management/IFileManagement.h"

// Implements POST command: creates new file with compressed content
// Usage: POST <filename> <content>
class PostCommand : public ICommand {
private:
    std::shared_ptr<IFileManagement> fileManager;

public:
    // Constructor receives dependencies for file handling
    PostCommand(std::shared_ptr<IFileManagement> fileManager);

    // Executes the 'post' command with the given arguments
    virtual CommandResult execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~PostCommand() = default;


};

#endif // POSTCOMMAND_H