#ifndef USERCLIENTCOMM_H
#define USERCLIENTCOMM_H

#include <iostream>
#include "communication/ICommunication.h"  

class UserClientComm : public ICommunication {
    public:
        UserClientComm();
        // Override nextCommand to get user input from console
        std::string recive() override;
        int send(std::string output) override;
};


#endif // USERCLIENTCOMM_H