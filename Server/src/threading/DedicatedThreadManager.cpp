#include "threading/DedicatedThreadManager.h"

void DedicatedThreadManager::startThread(std::unique_ptr<IRunnable> task) {
    // Create a new thread that runs the task's run method
    std::thread([task = std::move(task)]() mutable {
        task->run();
    }).detach(); // Detach the thread to allow it to run independently
}