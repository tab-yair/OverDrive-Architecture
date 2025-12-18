#ifndef CLIENT_HANDLER_H
#define CLIENT_HANDLER_H

#include <map>
#include <memory>
#include "communication/ICommunication.h"
#include "commands/ICommand.h"
#include "executors/IExecutor.h"
#include "protocol/ParsedCommand.h"
#include "parsers/IParser.h"
#include "threading/IRunnable.h"

// Handles client logic and runs as a task for a thread
class ClientHandler : public IRunnable {
private:
    std::unique_ptr<ICommunication> comm;
    std::unique_ptr<IExecutor> executor;
    std::shared_ptr<IParser> parser;

public:
    // Constructor: inject dependencies
    ClientHandler(std::unique_ptr<ICommunication> comm, 
        std::unique_ptr<IExecutor> executor,
        std::shared_ptr<IParser> parser);

    // Main application loop    
    void run();
};

#endif