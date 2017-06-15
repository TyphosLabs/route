"use strict";

module.exports = Queue;

const nextTick = require('process').nextTick;

/**
 * This class is used to queue up functions and call them in order. It also handles waiting for
 * any callbacks to finish, tracking all errors, and managing arguments to be used with each function.
 * 
 * @param {*} RunnerRoute - constructor to use to create a route instance to be passed as the 'this' arg for each function in the queue.
 * @param {[*]} args - array of arguments to be passed to each function
 * @param {*} [callee] - parent queue that is running and created this queue for a sub-route
 */
function Queue(RunnerRoute, args, callee){
    this.errors = undefined; // array of errors caught or passed
    this.pause = 0;          // if we are waiting on callbacks
    this.fns = [];           // the functions in the queue (numbers indicate an error handler index)
    this.err = [];           // error handlers
    this.data = args;        // the original args passed
    this.args = undefined;   // will be the args to call the fn returned by queue.next() with
    
    // check if this queue is a child queue
    if(callee){
        // we need the parent queue to wait for this queue to finish
        callee.$.wait();
        this.callee = callee;
    }
    
    // if we have a RunnerRoute constructor
    if(RunnerRoute){
        // create the route to be passed to each function in the queue (as the 'this' arg)
        this.route = new RunnerRoute(this);
        // save the constructor (needed for the async() function)
        this.runner = RunnerRoute;
    }
}

/**
 * Add a function to the queue.
 * 
 * @param {function} fn - function to be called by the queue
 * @param {boolean} [is_error_handler] - if this function will handle errors, pass true
 */
Queue.prototype.add = function(fn, is_error_handler){
    if(is_error_handler){
        this.fns.push(this.err.push(fn) - 1);
    } else {
        this.fns.push(fn);
    }
};

/**
 * Get the next function to be called (if any) and set the queue.args value to the args
 * that should be passed to that function. It will return false if we are pausing and 
 * undefined if the queue is done.
 * 
 * @returns {*}
 */
Queue.prototype.next = function(){
    // is there an error?
    var error = (this.errors ? this.errors[0] : undefined);
    
    // do we need to pause for callbacks?
    if(this.pause){
        // return a value that is not undefined to indicate we still have more
        // functions in the queue
        return false;
    }
    
    // find the next function
    while(true){
        // get the next function
        var fn = this.fns.shift();
        
        // queue was empty?
        if(fn === undefined){
            return;
        }
        
        // otherwise, check the function type
        switch(typeof fn){
            
            // if we got a number, an error handler is next
            case 'number':
                // clear out the errors because this function should be handling them
                this.errors = undefined;
                // add the error as the first argument (note: we do ignore the rest of the errors for now)
                this.args = [error].concat(this.data);
                // return the error handler
                return this.err[fn];
            
            // normal function is next
            case 'function':
                // if we have an error, we need to skip over this function
                if(error){
                    continue;
                }
                // reset the args (just in case the last function was an error handler)
                this.args = this.data;
                
                return fn;
        }
    }
};

/**
 * Run the queue
 */
Queue.prototype.run = function(){
    var fn;
    
    // call each function in sequence
    while((fn = this.next())){
        // call the function in a try/catch loop so we capture any errors
        try {
            fn.apply(this.route, this.args);
        } catch(err){
            // we caught an error. store it
            this.error(err);
        }
    }
    
    // queue empty (false would indicate a pause)
    if(fn === undefined){
        // was this queue created by another queue?
        if(this.callee){
            var parent_queue = this.callee.$;
            
            // pass any errors on to the parent queue
            if(this.errors && !parent_queue.errors){
                parent_queue.errors = this.errors;
            }
            
            // restart the parent queue
            parent_queue.wait(-1);
        }
        
        // if there are any errors left, we should just throw them because we do
        // not have any other functions to handle the error
        /* istanbul ignore if */
        else if(this.errors){
            throw this.errors[0];
        }
    }
};

/**
 * Pause the queue until (count) events have occurred. When an event finishes, call this with a
 * negative value to continue processing the queue.
 * 
 * @param {number} [count=1] - number of events we are waiting for or, if negative, the number of events that have finished.
 */
Queue.prototype.wait = function(count){
    // defaults to one event that we're waiting on
    if(arguments.length === 0){
        return this.pause++;
    }
    
    // otherwise, increment the pause counter
    this.pause += count;
    
    // if we have reached 0 events we are waiting on, continue processing the queue
    if(this.pause === 0){
        nextTick(() => this.run());
    }
};

/**
 * Add an error to the queue's error list.
 * 
 * @param {*} err - the Error you want to pass.
 */
Queue.prototype.error = function(err){
    if(!this.errors){
        this.errors = [err];
    } else {
        this.errors.push(err);
    }
};