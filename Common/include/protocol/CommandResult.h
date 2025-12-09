#ifndef COMMANDRESULT_H
#define COMMANDRESULT_H

#include <string>
#include <functional>
#include <unordered_map>


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
    static const std::unordered_map<CommandResult::Status, std::string> statusMap = {
        {CommandResult::Status::CREATED, "201 Created"},
        {CommandResult::Status::OK, "200 Ok"},
        {CommandResult::Status::NO_CONTENT, "204 No Content"},
        {CommandResult::Status::NOT_FOUND, "404 Not Found"},
        {CommandResult::Status::BAD_REQUEST, "400 Bad Request"}
    };

    auto it = statusMap.find(result.status);
    if (it == statusMap.end()) {
        return ""; // fallback
    }

    const std::string& statusText = it->second;
    // Protocol format: STATUS\n\nMESSAGE\n (empty line separator between status and message)
    return result.content.empty() ? statusText : statusText + "\n\n" + result.content;
}

#endif // COMMANDRESULT_H
