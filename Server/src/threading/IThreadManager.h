#ifndef ITHREAD_MANAGER_H
#define ITHREAD_MANAGER_H

#include <memory>
#include "threading/IRunnable.h"

// Interface for managing threads
class IThreadManager {
    public:
        // Starts a new thread to run the given task
        virtual void startThread(std::unique_ptr<IRunnable> task) = 0;

        // Virtual destructor to ensure proper cleanup of derived classes
        virtual ~IThreadManager() = default;

};

#endif // ITHREAD_MANAGER_H
