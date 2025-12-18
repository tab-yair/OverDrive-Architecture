#ifndef IRUNNABLE_H
#define IRUNNABLE_H

class IRunnable {
    public:
        // Runs the task. Must be implemented by any class that is Runnable.
        virtual void run() = 0;

        // Virtual destructor to ensure proper cleanup of derived classes
        virtual ~IRunnable() = default; 
};

#endif // IRUNNABLE_H