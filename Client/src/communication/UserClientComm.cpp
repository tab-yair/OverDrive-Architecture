#include "communication/UserClientComm.h"
UserClientComm::UserClientComm() {}

std::string UserClientComm::recive() {
    std::string input;
    std::getline(std::cin, input);
    return input;
}

int UserClientComm::send(std::string output) {
    std::cout << output << std::endl;
    return 0;
}
