#ifndef DEDICATED_THREAD_MANAGER_H
#define DEDICATED_THREAD_MANAGER_H

#include <thread>
#include <memory>
#include "threading/IThreadManager.h"
#include "threading/IRunnable.h"

// DedicatedThreadManager starts a new thread for each task.
class DedicatedThreadManager : public IThreadManager {
public:
    // Starts a new thread to run the given task
    void startThread(std::unique_ptr<IRunnable> task) override;

    // Virtual destructor
    ~DedicatedThreadManager() override = default;
};

#endif // DEDICATED_THREAD_MANAGER_H