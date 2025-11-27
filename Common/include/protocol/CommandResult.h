#ifndef COMMANDRESULT_H
#define COMMANDRESULT_H

#include <string>
#include <functional>


// Represents the result of executing a command
class CommandResult {
public:
    enum class Status {
        CREATED,
        OK,
        NO_CONTENT,
        NOT_FOUND,
        BAD_REQUEST
    };

    Status status;
    std::string content;

    CommandResult(Status s, const std::string& c = "")
        : status(s), content(c) {}
};

// Generic Adapter type
using ResultAdapter = std::function<std::string(const CommandResult&)>;

// Example: HTTP Adapter
inline std::string HTTPAdapter(const CommandResult& result) {
    switch (result.status) {
        case CommandResult::Status::CREATED:
            return result.content.empty() ? "201 Created" 
                                         : "201 Created\n\n" + result.content;
        case CommandResult::Status::OK:
            return result.content.empty() ? "200 Ok" 
                                         : "200 Ok\n\n" + result.content;
        case CommandResult::Status::NO_CONTENT:
            return result.content.empty() ? "204 No Content" 
                                         : "204 No Content\n\n" + result.content;
        case CommandResult::Status::NOT_FOUND:
            return "404 Not Found";
        case CommandResult::Status::BAD_REQUEST:
            return "400 Bad Request";
    }
    return ""; // fallback
}

#endif // COMMANDRESULT_H
