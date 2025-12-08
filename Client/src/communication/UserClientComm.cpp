#include "communication/UserClientComm.h"
#include <stdexcept>

UserClientComm::UserClientComm() {}

std::string UserClientComm::recieve() {
    std::string input;
    if (!std::getline(std::cin, input)) {
        // EOF reached - throw exception to signal client should exit
        throw std::runtime_error("EOF: stdin closed");
    }
    return input;
}

int UserClientComm::send(std::string output) {
    std::cout << output << std::endl;
    return 0;
}
