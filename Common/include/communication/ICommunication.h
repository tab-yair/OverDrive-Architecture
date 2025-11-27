#ifndef ICOMMUNICATION_H
#define ICOMMUNICATION_H

#include <string>

class ICommunication {
    public:
        // Pure virtual function to get the next command from the user
        virtual std::string recive() = 0;
        // Pure virtual function to handle output
        virtual int send(std::string output) = 0;

};


#endif // ICOMMUNICATION_H