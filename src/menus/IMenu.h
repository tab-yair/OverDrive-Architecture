#ifndef IMENU_H
#define IMENU_H

#include <string>
#include <vector>

class IMenu {
    public:
        // Virtual destructor for proper cleanup of derived classes
        virtual ~IMenu() = default;
        // Pure virtual function to get the next command from the user
        virtual std::vector<std::string> nextCommand() = 0;

};


#endif // IMENU_H