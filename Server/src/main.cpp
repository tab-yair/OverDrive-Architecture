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
#include "threading/IThreadManager.h"
#include "threading/DedicatedThreadManager.h"
#include "handlers/IClientHandlerFactory.h"
#include "handlers/ClientHandlerFactory.h"
#include "server/Server.h"
#include "commands/ClientCommandFactory.h"

ClientCommandFactory::ClientCommandFactory(std::shared_ptr<IFileManagement> fm) 
    : fileManager(fm) 

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: server <port>\n";
        return 1;
    }
    int port = std::stoi(argv[1]);
    // Step 1: Create file management system
    // 1.1 Create path mapper
    auto pathMapper = std::make_unique<HashPathMapper>("./storage_root");

    // 1.2 Create metadata store
    auto metadataStore = std::make_unique<JsonMetadataStore>("./metadata.json");

    // 1.3 Create base storage
    auto baseStorage = std::make_unique<LocalFileStorage>();

    // 1.4 Create compressor
    auto compressor = std::make_unique<RLECompressor>();

    // 1.5 Create storage strategy (compressed storage wrapping base storage)
    auto storageStrategy = std::make_unique<CompressedFileStorage>(
        std::move(compressor),
        std::move(baseStorage)
    );

    // 1.6 Create core file manager
    auto coreManager = std::make_unique<LocalFileManagement>(
        std::move(pathMapper),
        std::move(storageStrategy),
        std::move(metadataStore)
    );

    // 1.7 Wrap in thread-safe wrapper (shared_ptr for multiple client handlers)
    auto fs = std::make_shared<ThreadSafeFileManagement>(std::move(coreManager));


    // Step 2: Create thread manager
    std::shared_ptr<IThreadManager> threadManager = std::make_shared<DedicatedThreadManager>();

    // Step 3: Create command factory
    std::shared_ptr<ICommandFactory> commandFactory = std::make_shared<ClientCommandFactory>(fs);

    // Step 4: Create parser
    std::shared_ptr<IParser> parser = std::make_shared<CommandParser>();

    // Step 5: Create client handler factory
    std::shared_ptr<IClientHandlerFactory> clientHandlerFactory =
        std::make_shared<ClientHandlerFactory>(commandFactory, parser);

    // Step 6: Create and start server
    Server server(std::move(threadManager), std::move(clientHandlerFactory), port);
    server.start();


    // Cleanup handled automatically
    return 0;
}