const createParallel = (parallelism) => {
    const parallelismLevel = parallelism;
    const tasks = new Set();
    const nextTasksToRun = [];

    const addNewTask = (promise) => {
        tasks.add(promise);
        promise.then(() => {
            onTaskFinish(promise);
        }).catch(() => {
            onTaskFinish(promise);
        });
    }

    const onTaskFinish = (promise) => {
        tasks.delete(promise);
        if (nextTasksToRun.length){
            addNewTask(nextTasksToRun.shift()());
        }
    }

    return (asyncFunc) => {
        if (tasks.size < parallelismLevel){
            addNewTask(asyncFunc());
        } else{
            nextTasksToRun.push(asyncFunc);
        }
    }
}

const testAsyncFunc = (timeout) => () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log(timeout);
            resolve();
        }, timeout);
    })
}

const parallel = createParallel(2);
parallel(testAsyncFunc(100));
parallel(testAsyncFunc(300));
parallel(testAsyncFunc(400));
parallel(testAsyncFunc(150));