#include <map>
#include <memory>
#include "handlers/ClientHandler.h"
#include "communication/ICommunication.h"
#include "commands/ICommand.h"
#include "executors/IExecutor.h"
#include "protocol/ParsedCommand.h"
#include "parsers/IParser.h"
#include "compressor/ICompressor.h"
#include "file/IFileManagement.h"
#include "compressor/RLECompressor.h"
#include "file/LocalFileManagement.h"
#include "commands/PostCommand.h"
#include "commands/GetCommand.h"
#include "commands/SearchCommand.h"
#include "executors/CommandExecutor.h"
#include "parsers/CommandParser.h"

int main() {
    // Step 1: Create compressor (polymorphic with unique_ptr)
    std::unique_ptr<ICompressor> compressor = std::make_unique<RLECompressor>();

    // Step 2: Create file management (shared_ptr for shared ownership with commands)
    std::shared_ptr<IFileManagement> fileManager =
        std::make_shared<LocalFileManagement>(std::move(compressor));

    // Step 3: Create commands map (unique_ptr for ownership)
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["POST"] = std::make_unique<PostCommand>(fileManager);
    commands["GET"] = std::make_unique<GetCommand>(fileManager);
    commands["SEARCH"] = std::make_unique<SearchCommand>(fileManager);

    // Step 4: Create executor, parser, communication
    std::unique_ptr<IExecutor> executor =
        std::make_unique<CommandExecutor>(std::move(commands));
    std::unique_ptr<IParser> parser = std::make_unique<CommandParser>();
    // TODO: Create appropriate communication implementation
    // std::unique_ptr<ICommunication> comm = std::make_unique<...>();

    // Step 5: Create and run ClientHandler
    // ClientHandler handler(std::move(comm), std::move(executor), std::move(parser));
    // handler.run();

    // Step 6: Cleanup handled automatically
    return 0;
}