module.exports = Router;

const nextTick = require('process').nextTick;
const Queue = require('./queue.js');
const RunnerRoutes = require('./runner-routes.js');
const RunnerRouteProto = require('./runner-route.js');

/**
 * Create a router to attach route handlers to. Use route.run() to run the routes in sequence. Ex:
 * 
 * ```javascript
 * var route = new Router();
 * 
 * route.requireXSRF = function(event){
 *     if(!event.body || !event.body.xsrf){
 *         throw new Error('No XSRF token found');
 *     }
 * }
 * 
 * route.session = function(event){
 *     if(!event.sessid){
 *         throw new Error('No session found!');
 *     }
 *     event.session = session.load(
 *         event.sessid,
 *         this.cb(this.error)
 *     );
 * }
 * 
 * exports.handler = function(event, context, callback){
 *     route.run(event)
 *         .requireXSRF()
 *         .session()
 *         .then((err, event) => {
 *             callback(
 *                 err,
 *                 { session_exists: !!event.session }
 *             );
 *         });
 * }
 * ```
 */
function Router(){}

/**
 * Initiate a route to run with the passed arguments.
 * 
 * @param {...*} arg - argument to be passed to each function
 * @returns {run~Runner}
 */
Router.prototype.run = function(){
    // from now on, this is the function that will be called when calling route.run()
    // We replace this run function so that future calls do not have to build the routes
    // and constructors
    function run(){
        var args = Array.prototype.slice.call(arguments, 0);
        return new Runner(args, this);
    }
    
    /**
     * Route to be passed to each function in the queue as the 'this' value. It has several more functions
     * that the normal route class does not and will pause the parent queue if used.
     * @param {*} queue 
     */
    function RunnerRoute(queue){
        this.$ = queue;
        this.run = run;
    }
    // attach the special functions available inside a route handler (Ex: cb, error, ew)
    RunnerRoute.prototype = RunnerRouteProto;
    
    /**
     * Chainable object with a function for each route. Call each function to add it to the queue.
     * @param {[*]} args - the arguments to be passed to each function in the queue.
     * @param {*} [callee] - parent queue that created this runner
     */
    function Runner(args, callee){
        this.$ = new Queue(RunnerRoute, args, (callee instanceof RunnerRoute ? callee : undefined));

        // don't start running until the next tick. This allows the route to finish being created
        // before being run.
        nextTick(() => {
            // if there was an async() call but no asyncEnd() call we should throw an error
            /* istanbul ignore if */
            if(this.$.async){
                throw new Error('An .async() call was not closed with a .asyncEnd()');
            }
            // run the queue
            this.$.run();
        });
    }
    // attach the route wrappers to this class
    Runner.prototype = new RunnerRoutes(this);
    
    // use the new run function so we only compile the routes and create Runner/RunnerRoute constructors once.
    this.run = run;
    
    // return the runner for this run() call.
    return new Runner(Array.prototype.slice.call(arguments, 0));
};