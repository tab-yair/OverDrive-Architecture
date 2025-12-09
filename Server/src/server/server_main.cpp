#include <iostream>
#include <memory>
#include <filesystem>
#include <cstdlib>
#include <string>

// Server components
#include "server/server.h"
#include "handlers/ClientHandlerFactory.h"
#include "threading/DedicatedThreadManager.h"
#include "commands/ClientCommandFactory.h"
#include "parsers/CommandParser.h"

// File management system
#include "file/management/ThreadSafeFileManagement.h"
#include "file/management/LocalFileManagement.h"
#include "file/path/HashPathMapper.h"
#include "file/metadata/JsonMetadataStore.h"
#include "file/storage/LocalFileStorage.h"
#include "file/storage/CompressedFileStorage.h"
#include "file/compressor/RLECompressor.h"

int main(int argc, char* argv[]) {
    // Get base path from environment variable
    const char* envPath = std::getenv("OVERDRIVE_PATH");
    if (!envPath) {
        // throw std::runtime_error("Environment variable OVERDRIVE_PATH not set");
        return 1;
    }
    
    std::filesystem::path basePath = envPath;

    if (argc != 2) {
        // std::cerr << "Usage: server <port>\n";
        return 1;
    }
    
    int port = std::stoi(argv[1]);
    
    // Step 1: Create file management system
    // 1.1 Create path mapper
    auto pathMapper = std::make_unique<HashPathMapper>(basePath);

    // 1.2 Create metadata store
    auto metadataStore = std::make_unique<JsonMetadataStore>(basePath / "metadata");

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
    Server server(threadManager, clientHandlerFactory, port);
    server.start();

    return 0;
}