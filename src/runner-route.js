"use strict";

/**
 * Prototype object for a RunnerRoute constructor. Adds special functions that can 
 * be called within a route handler function.
 */
module.exports = {
    cb: callback,
    cbe: callbackWithErrorFirst,
    err: 'err',
    error: error,
    ew: errorWrapper
};

/**
 * Pass as a callback value to pause a queue until this callback is called.
 * 
 * @param {...*} [handlers] - functions to be called when this callback is finally called
 * @returns {callback~callbackFn}
 */
function callback(){
    // jshint validthis:true
    var queue = this.$;
    queue.wait(callbackFn);
    var called = false;
    var args = Array.prototype.slice.call(arguments, 0);
    var route = this;
    
    function callbackFn(){
        // callback fired
        if(callbackFn.errored){
            return;
        }
        
        // has this callback already been called?
        if(called){
            throw new Error('Callback called more than once!');
        }
        called = true;
        
        var arg;
        var a = Array.prototype.slice.call(arguments, 0);
        var error = false;
        
        // loop through the args looking for error handlers
        for(var i = 0; i < args.length; i++){
            arg = args[i];
            
            // all args should be functions
            if(arg !== 'err' && typeof arg !== 'function'){
                queue.error(new Error('Unable to process callback argument: ' + arg));
                error = true;
                continue;
            }
            
            if(arg.is_error_wrapper){
                // found an error wrapper
                // if there is a truthy value
                if(a[i]){
                    // wrap the error with a friendly one
                    error = true;
                    queue.error(arg(a[i]));
                }
                // hide this arg from other handlers
                a.splice(i, 1);
                args.splice(i--, 1);
            }
            
            else if(arg === 'err'){
                // found an error handler
                // if there is a truthy value
                if(a[i]){
                    // we have found an error!
                    error = true;
                    queue.error(a[i]);
                }
                // hide this arg from other handlers
                a.splice(i, 1);
                args.splice(i--, 1);
            }
        }
        
        // if there wasn't an error
        if(!error){
            // call all the remaining callback handlers with the args that are remaining
            for(i = 0; i < args.length; i++){
                try {
                    args[i].apply(route, a);
                } catch(err){
                    queue.error(err);
                }
            }
        }
        
        // we are done waiting for this callback
        queue.wait(-1);
    }
    
    return callbackFn;
}

function callbackWithErrorFirst(handler){
    // jshint validthis:true
    var route = this;
    var queue = this.$;
    queue.wait(cbe);
    var called = false;
    function cbe(err){
        // callback fired
        if(cbe.errored){
            return;
        }
        
        // has this callback already been called?
        if(called){
            throw new Error('Callback called more than once!');
        }
        called = true;
        
        if(err){
            queue.error(err);
            return queue.wait(-1);
        }
        
        if(handler){
            try {
                handler.apply(route, Array.prototype.slice.call(arguments, 1));
            } catch(err){
                queue.error(err);
            }
        }
        
        // we are done waiting for this callback
        queue.wait(-1);
    }
    
    return cbe;
}

function error(err){
    // jshint validthis:true
    if(!err && arguments.length === 0){
        return 'err';
    }
    
    this.$.error(err);
}

/**
 * Error wrapper. Use this for callbacks whos errors need to be made friendly.
 * 
 * @param {function} constructor - Error class constructor
 * @param {...*} [arg] - arguments to pass to the error. Use '@' to pass the error we are wrapping.
 */
function errorWrapper(constructor){
    var a = arguments;
    function errorWrapper(err){
        var args = Array.prototype.slice.call(a, 1);
        for(var i = 0; i < args.length; i++){
            if(args[i] === '@'){
                args[i] = err;
            }
        }
        
        // https://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
        function Err() {
            return constructor.apply(this, args);
        }
        Err.prototype = constructor.prototype;
        return new Err();
    }
    
    errorWrapper.is_error_wrapper = true;
    
    return errorWrapper;
}