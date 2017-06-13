module.exports = Route;

const process = require('process');

function Route(routes){}

Route.prototype.ready = function(){
    function Runner(){
        var queue = [];
        var error_handlers = [];
        var running = false;
        var master_queue = [];
        var run = () => {
            if(queue.length > 1){
                master_queue.push(queue.slice(0));
            } else {
                master_queue.push(queue[0]);
            }
            queue.length = 0;
            if(running){
                return this;
            }
            running = true;
            process.nextTick(() => {
                runRoute(this, master_queue, error_handlers);
            });
            return this;
        };
        this.$ = (fn) => {
            if(fn.length > 1){
                fn = error_handlers.push(fn) - 1;
            }
            queue.push(fn);
            return run;
        };
    }
    
    Runner.prototype = {
        finally: runFinally,
        cb: callbackFn
    };

    for(var prop in this){
        switch(prop){
            case 'ready':
                continue;
            case 'cb':
            case 'finally':
            case 'ew':
            case 'err':
            case 'callback':
            case 'event':
            case 'error':
            case '$':
            case 'wait':
                throw new Error('Route using reserved keyword. Route name cannot be [' + prop + ']');
        }
        queueFn(this, prop, Runner);
    }
    
    return this;
};

function callbackFn(){
    var args = [].slice.call(arguments, 0);
    var len = args.len;
    var erri = args.indexOf('err');
    
    if(erri === -1){
        erri = false;
    } else {
        if(~args.indexOf('err', erri + 1)){
            throw new Error('Only one error should be expected from a callback');
        }
    }
    
    return this.wait(function(){
        if(erri !== false){
            if(arguments[erri]){
                return this.error(arguments[erri]);
            }
        }
        
        for(var i = 0; i < len; i++){
            if(i === erri) continue;
            var arg = args[i];
            switch(typeof arg){
                case 'function':
                    try {
                        arg.call(data, runnable);
                    } catch(err){
                        this.error(err);
                    }
            }
        }
    });
}

function runFinally(fn, thisArg){
    // jshint validthis:true
    return this.$(function(error, route){
        fn.call(thisArg, error, this);
    })();
}

function queueFn(route, name, Runner){
    var fn = route[name];
    
    Object.defineProperty(Runner.prototype, name, {
        get: function(){
            return this.$(fn);
        },
        configurable: false
    });
    
    Object.defineProperty(route, name, {
        get: () => {
            var runner = new Runner();
            return runner[name];
        },
        configurable: false
    });
}

function runRoute(runner, master_queue, error_handlers){
    var wait;
    var len = master_queue.length;
    var queue = master_queue.splice(0, len);
    var fn;
    var data = {};
    var error;
    
    for(var i = 0; i < len; i++){
        if(wait){
            break;
        }
        
        fn = queue[i];
        
        try {
            switch(typeof fn){
                case 'number':
                    error_handlers[fn].call(data, error, runner);
                    break;
                case 'object':
                    break;
                case 'function':
                    if(error) continue;
                    fn.call(data, runner);
                    break;
            }
        } catch(err){
            error = err;
        }
    }
    
    if(i === len && error){
        throw error;
    }
}