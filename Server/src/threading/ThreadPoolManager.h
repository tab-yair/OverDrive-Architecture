#ifndef THREADPOOLMANAGER_H
#define THREADPOOLMANAGER_H

#include <vector>
#include <thread>
#include <memory>
#include <queue>
#include <mutex>
#include <condition_variable>

#include "IThreadManager.h"
#include "IRunnable.h"

class ThreadPoolManager : public IThreadManager {
public:
    explicit ThreadPoolManager(size_t numThreads);
    ~ThreadPoolManager() override;

    ThreadPoolManager(const ThreadPoolManager&) = delete; // Disable copy constructor
    ThreadPoolManager& operator=(const ThreadPoolManager&) = delete; // Disable copy assignment

    void startThread(std::unique_ptr<IRunnable> task) override;

private:
    void workerThread();

    std::vector<std::thread> workers;
    std::queue<std::unique_ptr<IRunnable>> tasks;

    std::mutex queueMutex;
    std::condition_variable condition;
    bool stop;
};

#endif // THREADPOOLMANAGER_H
