# Route

## `route.cb()`

Creates a callback function and returns it. It should handle errors and simple mapping. More complex handling should be done with an arrow function.

```javascript
route.session = function(route){
    Session.create(
        { email: this.user.email },
        
        // create a callback function that will process any errors otherwise it will store the second argument
        // in request.session
        route.cb('err', 'session')
    );
};
```

## `route.err(err)`

Checks to see if err is not null/undefined. If so, throws it so it is caught by the route handler.

```javascript
route.session = function(route){
    Session.create(
        { email: this.user.email },
        (err, session) => {
            route.err(err);
            this.session = session;
        }
    )
};

## `route.ew(error_constructor, error_arg1...)`
