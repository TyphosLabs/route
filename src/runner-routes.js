module.exports = RunnerRoutes;

const Queue = require('./queue.js');

/**
 * Create an object with functions for each route attached to the router passed. Each function
 * will add the function with the matching name from the router to the queue.
 * @param {Router} router - router with routes on it. 
 */
function RunnerRoutes(router){
    
    // wrap all functions found on this router with queueing functions
    for(var path in router){
        addRoute(this, path, router[path]);
    }
}

/**
 * Call the following routes asynchronously. Requires a asyncEnd() call to close the list.
 */
RunnerRoutes.prototype.async = function async(){
    var queue = new Queue(null, []);
    queue.async = this.$;
    this.$ = queue;
    return this;
};

/**
 * Close the list of routes to be called asynchronously and add a handler function to the queue.
 */
RunnerRoutes.prototype.asyncEnd = function asyncEnd(){
    var async = this.$;
    var queue = this.$ = async.async;
    queue.add(function(err){
        var fn;
        var args = Array.prototype.slice.call(arguments, 1);
        async.data = args;
        if(err){
            async.error(err);
        }
        while((fn = async.next())){
            fn.apply(new queue.runner(queue), async.args);
            // reset args just in case
            async.data = args;
        }
        if(async.errors){
            while(async.errors.length){
                queue.error(async.errors.shift());
            }
        }
    }, true);
    return this;
};

/**
 * Add an error handler function to the queue.
 */
RunnerRoutes.prototype.then = function then(fn, thisArg){
    if(arguments.length === 1){
        thisArg = this;
    }
    
    this.$.add(function(){
        fn.apply(thisArg, Array.prototype.slice.call(arguments, 0));
    }, true);
    return this;
};

/**
 * Attaches a function, with `path` value as its name, that will queue `fn` when called.
 * 
 * @param {RunnerRoutes} routes - RunnerRoutes instance to attach the function to
 * @param {*} path - the name of the function
 * @param {*} fn - the function to be queued
 */
function addRoute(routes, path, fn){
    function handler(){
        this.$.add(fn);
        return this;
    }
    
    Object.defineProperty(routes, path, {
        value: handler,
        configurable:false,
        enumerable:true
    });
}