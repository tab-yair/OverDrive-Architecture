#include "app.h"


App::App(IMenu* menu, std::map<std::string, ICommand*> commands) : menu(menu), commands(commands) {}


void App::run() {
    while (true) {
        // Get the next command (task[0]) and arguments (task[1]) from the menu
        std::vector<std::string> task = menu->nextCommand();
        try {
            // Call the execute method of the command with arguments as one string
            commands[task[0]]->execute(task[1]);
        }
        catch(...){
            //  how to ignore invalid input
        }
    }
}