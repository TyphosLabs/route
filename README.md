# Route

Route is an interesting project that was born of fustration with promises. I found myself liking really small functions can be used in a plug-and-play manner (like express middleware). Although you can do some of this with promises, I found them to be very awkward and they required too much hacking to work well with callbacks. I don't know if this is a good alternative, but it seems interesting.

## Installation

```
npm install --save @typhoslabs/route
```

## Use

The idea behind route is a series of small functions (like express middleware) that do one piece of a process.

```javascript
var Router = require('@typhoslabs/route');

// create a new router
var route = new Router();

// add some middleware...
route.requireXSRF = function(event){
    if(!event.body || !event.body.xsrf){
        throw new Error('No XSRF token');
    }
};

route.requireSession = function(event){
    if(!event.session_id){
        throw new Error('No session token.');
    }
    
    // the cbe function waits for a callback and checks the first arg for an error,
    // if not found, it calls the handler function
    Session.load(event.session_id, this.cbe(session => {
        event.session = session;
    }));
};

route.checkXSRF = function(event){
    // should use a safe compare irl
    if(!event.session.xsrf || event.session.xsrf !== event.body.xsrf){
        throw new Error('Missing or invalid XSRF token');
    }
};

// ... now lets use our middleware

// AWS Lambda handler
exports.handler = (event, context, callback) => {
    // we are going to run our route with event as the first arg passed to each function
    route.run(event)
    
        // our middleware
        .requireXSRF()
        .requireSession()
        .checkXSRF()
        
        // when there is an error or everything is done
        .then((err, event) => {
            callback(err, { success:(err ? true : false) });
        });
};
```

## `route.cb()`
## `route.cbe()`
