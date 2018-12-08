const createParallel = (parallelism) => {
    const parallelismLevel = parallelism;
    let runningTasks = new Set();
    let taskId = 0;
    const newTasksIdsToRun = new Set();

    const addNewTask = (promise, tasks) => {
        tasks.add(promise);
        return onTaskFinished(promise, tasks);
    }

    const onTaskFinished = (task, tasks) => {
        return task.then(() => {
            tasks.delete(task);
        }).catch((err) => {
            tasks.delete(task);
            throw err;
        });
    }

    const appendNewTaskToRunningTask = (nextTaskId, asyncFunc) => {
        if (newTasksIdsToRun.has(nextTaskId)){
            newTasksIdsToRun.delete(nextTaskId);
            return asyncFunc().then(() => {
                return {nextTaskId};
            }).catch((err) => {
                return {nextTaskId, error: err};
            });
        }
    }

    const getThrottledTaskPromise = (throttledTaskId, currentTasks) => {
        return new Promise(async (resolve, reject) => {
            let isCurrentTaskResolved = false;
            let rejectedError;

            while (!isCurrentTaskResolved && currentTasks.size){
                const promiseResult = await Promise.race(currentTasks);

                if (promiseResult){
                    const {nextTaskId, error} = promiseResult;
                    rejectedError = error;
                    isCurrentTaskResolved = nextTaskId === throttledTaskId;
                }
            }

            if (rejectedError){
                return reject(rejectedError);
            }

            resolve();
        });
    }

    return (asyncFunc) => {
        if (runningTasks.size < parallelismLevel){
            return addNewTask(asyncFunc(), runningTasks);
        }

        const currentTaskId = ++taskId;
        newTasksIdsToRun.add(currentTaskId);

        const currentTasks = new Set();
        const newRunningTasks = new Set();

        runningTasks.forEach((task) => {
            const newTask = task.then(() => {
                return appendNewTaskToRunningTask(currentTaskId, asyncFunc)
            }).catch(err => {
                return appendNewTaskToRunningTask(currentTaskId, asyncFunc);
            });

            addNewTask(newTask, newRunningTasks);
            addNewTask(newTask, currentTasks);
        });

        runningTasks = newRunningTasks;

        return getThrottledTaskPromise(currentTaskId, currentTasks);
    }
}

const testAsyncFunc = (timeout, toReject) => () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log(timeout);

            if (toReject){
                return reject(`reject ${timeout}!`);
            }
            resolve();
        }, timeout);
    })
}

const parallel = createParallel(2);
parallel(testAsyncFunc(100)).then(() => console.log('after 100'));
parallel(testAsyncFunc(300)).then(() => console.log('after 300'));
parallel(testAsyncFunc(400)).then(() => console.log('after 400'));
parallel(testAsyncFunc(150)).then(() => console.log('after 150'));
parallel(testAsyncFunc(450)).then(() => console.log('after 450'));
parallel(testAsyncFunc(250, true)).then(() => console.log('after 250')).catch(err => console.log(err));