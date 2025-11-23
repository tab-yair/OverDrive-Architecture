#include <map>
#include <memory>
#include "App.h"
#include "IMenu.h"
#include "ICommand.h"
#include "IExecutor.h"
#include "ParsedCommand.h"
#include "IParser.h"
#include "ICompressor.h"
#include "IFileManagement.h"
#include "RLECompressor.h"
#include "LocalFileManagement.h"
#include "AddCommand.h"
#include "GetCommand.h"
#include "SearchCommand.h"
#include "CommandExecutor.h"
#include "CommandParser.h"
#include "ConsoleMenu.h"

int main() {
    // Step 1: Create compressor (polymorphic with unique_ptr)
    std::unique_ptr<ICompressor> compressor = std::make_unique<RLECompressor>();

    // Step 2: Create file management (shared_ptr for shared ownership with commands)
    std::shared_ptr<IFileManagement> fileManager =
        std::make_shared<LocalFileManagement>(std::move(compressor));

    // Step 3: Create commands map (unique_ptr for ownership)
    std::map<std::string, std::unique_ptr<ICommand>> commands;
    commands["add"] = std::make_unique<AddCommand>(fileManager);
    commands["get"] = std::make_unique<GetCommand>(fileManager);
    commands["search"] = std::make_unique<SearchCommand>(fileManager);

    // Step 4: Create executor, parser, menu
    std::unique_ptr<IExecutor> executor =
        std::make_unique<CommandExecutor>(std::move(commands));
    std::unique_ptr<IParser> parser = std::make_unique<CommandParser>();
    std::unique_ptr<IMenu> menu = std::make_unique<ConsoleMenu>();

    // Step 5: Create and run App (App takes ownership!)
    // App signature: App(std::unique_ptr<IMenu>, std::unique_ptr<IExecutor>, std::unique_ptr<IParser>)
    App app(std::move(menu), std::move(executor), std::move(parser));
    app.run();

    // Step 6: Cleanup handled automatically
    return 0;
}