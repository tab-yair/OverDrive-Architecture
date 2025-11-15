#ifndef ADDCOMMAND_H
#define ADDCOMMAND_H

#include <vector>
#include <string>
#include <memory>
#include "ICommand.h"
#include "../FileManagement/FileManager.h"
#include "../compression/ICompressor.h"

// The AddCommand class implements the 'add' command.
// It creates a new file and writes the RLE-compressed version of the input text into it.
// Expected usage: add [file_name] [text]
class AddCommand : public ICommand {
public:
    // Constructor receives dependencies for file handling and compression
    AddCommand(std::shared_ptr<FileManager> fileManager,
               std::shared_ptr<ICompressor> compressor);

    // Executes the 'add' command with the given arguments
    virtual void execute(const std::vector<std::string>& args) override;

    // Virtual destructor
    virtual ~AddCommand() = default;

private:
    std::shared_ptr<FileManager> fileManager;   // Handles file creation and writing
    std::shared_ptr<ICompressor> compressor;     // Handles compression logic (RLE)
};

#endif // ADDCOMMAND_H
