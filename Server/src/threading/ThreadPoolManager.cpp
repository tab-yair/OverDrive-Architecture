#include "ThreadPoolManager.h"

// Constructor: Initializes the thread pool with the specified number of threads
ThreadPoolManager::ThreadPoolManager(size_t numThreads) : stop(false) {
    for (size_t i = 0; i < numThreads; ++i) {
        workers.emplace_back(&ThreadPoolManager::workerThread, this);
    }
}

// Destructor: Joins all threads and cleans up
ThreadPoolManager::~ThreadPoolManager() {
    // Signal all threads to stop    
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        stop = true;
    }
    // Notify all worker threads to wake up
    condition.notify_all();
    for (std::thread &worker : workers) {
        if (worker.joinable()) {
            worker.join();
        }
    }
}

// Starts a new thread to run the given task    
void ThreadPoolManager::startThread(std::unique_ptr<IRunnable> task) {
    // Add the task to the queue
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        tasks.push(std::move(task));
    }
    // Notify one worker thread that a new task is available
    condition.notify_one();
}

void ThreadPoolManager::workerThread() {
    // Continuously process tasks from the queue
    while (true) {
        std::unique_ptr<IRunnable> task;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            condition.wait(lock, [this] { return stop || !tasks.empty(); });
            if (stop && tasks.empty()) {
                return;
            }
            task = std::move(tasks.front());
            tasks.pop();
        }
        // Execute the task outside the lock
        try {
            task->run();
        } catch (const std::exception& e) {
            // Handle exceptions from task execution
            // For example, log the error
        }
    }
}

