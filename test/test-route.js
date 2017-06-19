/* globals describe, it */

const Chai = require('chai');
const expect = Chai.expect;

const Router = require('../index.js');

describe('route', () => {
    it('should be a constructor', () => {
        expect(Router).to.be.a('function');
        expect(() => new Router()).not.to.throw();
    });
    
    it('should allow routes to be attached', done => {
        var route = new Router();
        var hit = '';
        
        route.test = function(route){
            hit += 'test';
        };
        
        route.run()
            .test()
            .then((err, result) => {
                expect(err).to.equal(undefined);
                expect(hit).to.equal('test');
                done();
            });
    });
    
    it('should catch thrown errors in route handlers', done => {
        var route = new Router();
        var error = new Error('test');
        var hit = '';
        
        route.test = function(route){
            throw error;
        };
        
        route.testSkip = function(){
            hit += 'skip';
        };
        
        route.run()
            .test()
            .testSkip()
            .then((err, result) => {
                expect(err).to.equal(error);
                expect(hit).to.equal('');
                done();
            });
    });
    
    it('should be able to add error handler function', done => {
        var route = new Router();
        var error = new Error('test');
        var hit = '';
        
        route.test = function(route){
            throw error;
        };
        
        route.run()
            .test()
            .then((err) => {
                hit = err;
            })
            .then((err, result) => {
                expect(err).to.equal(undefined);
                expect(hit).to.equal(error);
                done();
            });
    });
    
    it('should pass any number of arguments through to the next function', done => {
        var route = new Router();
        var A = {};
        var B = {};
        var C = {};
        
        route.test = function(a, b, c){
            expect(a).to.equal(A);
            expect(b).to.equal(B);
            expect(c).to.equal(C);
        };
        
        route.run(A, B, C)
            .test()
            .then((err, a, b, c) => {
                expect(a).to.equal(A);
                expect(b).to.equal(B);
                expect(c).to.equal(C);
                done();
            });
    });
    
    it('should ignore errors if there is already an error set', done => {
        var route = new Router();
        var error = new Error('test');
        route.test = function(){
            this.error(error);
            this.error(new Error('2nd error'));
            throw new Error('3rd error');
        };
        route.run()
            .test()
            .then(err => {
                expect(err).to.equal(error);
                done();
            });
    });
    
    it('should work with a callback', done => {
        var route = new Router();
        var hit = '';
        route.test = function(){
            var cb = this.cb(
                'err',
                val => {
                    expect(val).to.equal('test');
                    hit += 'timeout';
                }
            );
            setTimeout(() => cb(null, 'test'), 100);
        };
        route.run()
            .test()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('timeout');
                done();
            });
    });
    
    it('should be able to handle errors returned by callback', done => {
        var route = new Router();
        var error = new Error('test');
        route.test = function(){
            var cb = this.cb('err');
            setTimeout(() => {
                cb(error);
            }, 10);
        };
        route.run()
            .test()
            .then(err => {
                expect(err).to.equal(error);
                done();
            });
    });
    
    it('should handle errors inside callback handler', done => {
        var route = new Router();
        var error = new Error('test');
        route.test = function(){
            setTimeout(this.cb(() => {
                throw error;
            }), 10);
        };
        route.run()
            .test()
            .then(err => {
                expect(err).to.equal(error);
                done();
            });
    });
    
    it('should throw if callback has bad handler value', done => {
        var route = new Router();
        route.test = function(){
            setTimeout(this.cb('some illogical value'), 10);
        };
        route.run()
            .test()
            .then(err => {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.equal('Unable to process callback argument: some illogical value');
                done();
            });
    });
    
    it('should throw if callback called more than once', done => {
        var route = new Router();
        var hit = '';
        route.test = function(){
            var cb = this.cb();
            setTimeout(() => {
                hit += 'timeout';
                cb();
            }, 100);
            setTimeout(() => {
                hit += 'timeout';
                expect(() => cb()).to.throw('Callback called more than once');
            }, 110);
        };
        route.run()
            .test()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('timeout');
                hit += 'done';
                setTimeout(() => {
                    expect(hit).to.equal('timeoutdonetimeout');
                    done();
                }, 100);
            });
    });
    
    it('should wait for all callbacks to be called', done => {
        var route = new Router();
        var hit = '';
        route.test = function(){
            setTimeout(this.cb(() => {
                hit += 'a';
            }), 100);
            setTimeout(this.cb(() => {
                hit += 'b';
            }), 110);
        };
        route.run()
            .test()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('ab');
                hit += 'done';
                setTimeout(() => {
                    expect(hit).to.equal('abdone');
                    done();
                }, 100);
            });
    });
    
    it('should handle multiple routes running at the same time', done => {
        var route = new Router();
        var hit = '';
        route.test = function(v, wait){
            hit += v;
            var cb = this.cb();
            setTimeout(() => {
                hit += v.toUpperCase();
                cb();
            }, wait);
        };
        route.test2 = function(v){
            hit += v.charCodeAt(0) - 'a'.charCodeAt(0);
        };
        route.run('a', 100)
            .test()
            .test2();
        route.run('b', 50)
            .test()
            .test2();
        route.run('c', 150)
            .test()
            .test2()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('abcB1A0C2');
                done();
            });
    });
    
    it('should use the thisArg value if passed to a .then() call', done => {
        var route = new Router();
        var hit = '';
        var thisArg = { test:'test' };
        route.test = function(v){
            hit += v;
        };
        route.run('test', 150)
            .test()
            .then(function(err){
                if(err) throw err;
                expect(hit).to.equal('test');
                expect(this).to.equal(thisArg);
                done();
            }, thisArg);
    });
    
    it('should be able to run a route inside a route handler', done => {
        var route = new Router();
        var v = {};
        route.test = function(arg){
            arg.test = (arg.test || '') + 'test';
            this.run(arg)
                .test2();
        };
        route.test2 = function(arg){
            arg.test2 = (arg.test2 || '') + 'test2';
        };
        route.run(v)
            .test()
            .then((err, arg) => {
                if(err) throw err;
                expect(arg).to.equal(v);
                expect(arg).to.deep.equal({ test:'test', test2:'test2' });
                done();
            });
    });
    
    it('should pass error from a route run inside a route handler', done => {
        var route = new Router();
        var error = new Error('test');
        route.test = function(){
            this.run()
                .test2();
        };
        route.test2 = function(){
            throw error;
        };
        route.run()
            .test()
            .then(err => {
                expect(err).to.equal(error);
                done();
            });
    });
    
    it('should be able to handle multiple routes run from a route handler', done => {
        var route = new Router();
        var test = {};
        
        route.test = function(arg){
            this.run(arg)
                .test2();
                
            this.run(arg)
                .test3();
        };
        
        route.test2 = function(arg){
            arg.test2 = true;
        };
        
        route.test3 = function(arg){
            setTimeout(this.cb(() => arg.test3 = true), 50);
        };
        
        route.run(test)
            .test()
            .then((err, arg) => {
                expect(arg).to.equal(test);
                expect(arg).to.deep.equal({ test2:true, test3:true });
                done();
            });
    });
    
    it('should support async calls', done => {
        var route = new Router();
        var test = { hit:'' };
        
        route.test = function(arg){
            setTimeout(this.cb(() => arg.test = true), 50);
        };
        route.test1 = function(arg){
            setTimeout(this.cb(() => arg.hit += '1'), 60);
        };
        route.test2 = function(arg){
            setTimeout(this.cb(() => arg.hit += '2'), 90);
        };
        route.test3 = function(arg){
            setTimeout(this.cb(() => arg.hit += '3'), 30);
        };
        
        route.run(test)
            .test()
            .async()
                .test1()
                .test2()
                .test3()
            .asyncEnd()
            .then((err, arg) => {
                if(err) throw err;
                expect(arg).to.equal(test);
                expect(arg).to.deep.equal({ test:true, hit:'312' });
                done();
            });
    });
    
    it('should handle errors inside an async run', done => {
        var route = new Router();
        var error = new Error('test');
        var hit = '';
        
        route.test = function(){
            hit += '1';
        };
        
        route.test2 = function(){
            hit += '2';
        };
        
        route.test3 = function(){
            hit += '3';
            throw error;
        };
        
        route.run()
            .test()
            .async()
                .test2()
                .test3()
            .asyncEnd()
            .then(err => {
                expect(err).to.equal(error);
                expect(hit).to.equal('123');
                done();
            });
    });
    
    it('should handle errors inside an async run where the first error (chronologically) is returned', done => {
        var route = new Router();
        var error = new Error('test');
        var hit = '';
        
        route.test = function(){
            hit += '1';
        };
        
        route.test2 = function(){
            hit += '2';
            setTimeout(this.cb(() => {
                throw new Error('error 2');
            }));
        };
        
        route.test3 = function(){
            hit += '3';
            throw error;
        };
        
        route.run()
            .test()
            .async()
                .test2()
                .test3()
            .asyncEnd()
            .then(err => {
                expect(err).to.equal(error);
                expect(hit).to.equal('123');
                done();
            });
    });
    
    it('should handle errors passed to async', done => {
        var route = new Router();
        var error = new Error('test');
        var hit = '';
        
        route.test = function(){
            hit += '1';
            throw error;
        };
        
        route.test2 = function(){
            hit += '2';
        };
        
        route.test3 = function(){
            hit += '3';
        };
        
        route.run()
            .test()
            .async()
                .test2()
                .test3()
            .asyncEnd()
            .then(err => {
                expect(err).to.equal(error);
                expect(hit).to.equal('1');
                done();
            });
    });
    
    it('should be able to handle errors passed to async', done => {
        var route = new Router();
        var error = new Error('test');
        var error2 = new Error('test');
        var hit = '';
        
        route.test = function(){
            hit += '1';
            throw error;
        };
        
        route.test2 = function(){
            hit += '2';
            throw error2;
        };
        
        route.run()
            .test()
            .async()
                .then(err => {
                    expect(err).to.equal(error);
                })
                .test2()
            .asyncEnd()
            .then(err => {
                expect(err).to.equal(error2);
                expect(hit).to.equal('12');
                done();
            });
    });
    
    it('should allow callbacks to be called immediately', done => {
        var route = new Router();
        var test = { hit:'' };
        
        route.test = function(arg){
            this.cb()();
            setTimeout(this.cb(() => {
                arg.hit += 2;
            }), 100);
            arg.hit += 1;
        };
        
        route.run(test)
            .test()
            .then((err, arg) => {
                if(err) throw err;
                expect(arg).to.equal(test);
                expect(arg).to.deep.equal({ hit:'12' });
                done();
            });
    });
    
    it('should ignore callbacks responses if the route handler throws before returning', done => {
        var route = new Router();
        var hit = '';
        var error = new Error('error');
        
        route.test = function(){
            setTimeout(this.cb(() => {
                hit += '1';
            }), 100);
            
            setTimeout(this.cb(() => {
                hit += '2';
            }), 50);
            
            throw error;
        };
        
        route.run()
            .test()
            .then(err => {
                expect(hit).to.equal('');
                expect(err).to.equal(error);
                
                // wait until long after the callbacks should have fired
                setTimeout(() => {
                    expect(hit).to.equal('');
                    done();
                }, 120);
            });
    });
    
    it('should wrap callback errors when route.ew() called', done => {
        var route = new Router();
        var hit = '';
        var error = new Error('test');
        
        function MyError(message, err){
            this.err = err;
            this.message = message;
        }
        
        route.ewTest = function(){
            var cb = this.cb(
                this.ew(MyError, 'Wrapper message', '@'),
                () => hit += 'cb'
            );
            
            setTimeout(() => {
                hit += 'timer';
                cb(error);
            }, 50);
        };
        
        route.run()
            .ewTest()
            .then(err => {
                expect(err).to.be.instanceOf(MyError);
                expect(err.message).to.equal('Wrapper message');
                expect(err.err).to.equal(error);
                expect(hit).to.equal('timer');
                done();
            });
    });
    
    it('should skip route.ew() if falsy value returned', done => {
        var route = new Router();
        var hit = '';
        
        function MyError(message, err){
            this.err = err;
            this.message = message;
        }
        
        route.ewTest = function(){
            var cb = this.cb(
                this.ew(MyError, 'Wrapper message', '@'),
                () => hit += 'cb'
            );
            
            setTimeout(() => {
                hit += 'timer';
                cb();
            }, 50);
        };
        
        route.run()
            .ewTest()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('timercb');
                done();
            });
    });
    
    it('should .cb() should work with this.error() passed as an error wrapper', done => {
        var route = new Router();
        var hit = '';
        var error = new Error('test');
        
        route.ewTest = function(){
            var cb = this.cb(
                this.error(),
                () => hit += 'cb'
            );
            
            setTimeout(() => {
                hit += 'timer';
                cb(error);
            }, 50);
        };
        
        route.run()
            .ewTest()
            .then(err => {
                expect(err).to.equal(error);
                expect(hit).to.equal('timer');
                done();
            });
    });
    
    it('should be able to run a new route from within a callback', done => {
        var route = new Router();
        var hit = '';
        
        route.test = function(){
            setTimeout(this.cb(function(){
                this.run()
                    .test2();
            }), 50);
        };
        route.test2 = function(){
            hit += '2';
        };
        
        route.run()
            .test()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('2');
                done();
            });
    });
    
    it('should be able to run a new route from within a callback arrow function', done => {
        var route = new Router();
        var hit = '';
        
        route.test = function(){
            setTimeout(this.cb(() => {
                this.run()
                    .test2();
            }), 50);
        };
        route.test2 = function(){
            hit += '2';
        };
        
        route.run()
            .test()
            .then(err => {
                if(err) throw err;
                expect(hit).to.equal('2');
                done();
            });
    });
    
    describe('.cbe() - callback with error first', () => {
        it('should pause queue and have route for "this"', done => {
            var route = new Router();
            var hit = '';
            
            route.test = function(){
                var cb = this.cbe(arg => {
                    hit += arg;
                    this.run(arg)
                        .test2();
                });
                setTimeout(() => cb(null, 1), 50);
            };
            route.test2 = function(arg){
                hit += arg + 1;
            };
            
            route.run()
                .test()
                .then(err => {
                    if(err) throw err;
                    expect(hit).to.equal('12');
                    done();
                });
        });
        
        it('should handle an error', done => {
            var route = new Router();
            var error = new Error('test');
            
            route.test = function(){
                var cb = this.cbe();
                
                setTimeout(() => {
                    cb(error);
                }, 50);
            };
            
            route.run()
                .test()
                .then(err => {
                    expect(err).to.equal(error);
                    done();
                });
        });
        
        it('should handle a thrown error inside the handler', done => {
            var route = new Router();
            var error = new Error('test');
            
            route.test = function(){
                setTimeout(this.cbe(() => {
                    throw error;
                }), 50);
            };
            
            route.run()
                .test()
                .then(err => {
                    expect(err).to.equal(error);
                    done();
                });
        });
        
        it('should handle no handler and no error', done => {
            var route = new Router();
            
            route.test = function(){
                var cb = this.cbe();
                
                setTimeout(() => {
                    cb();
                }, 50);
            };
            
            route.run()
                .test()
                .then(err => {
                    if(err) throw err;
                    done();
                });
        });
        
        it('should throw if callback called more than once', done => {
            var route = new Router();
            var hit = '';
            route.test = function(){
                var cb = this.cbe();
                setTimeout(() => {
                    hit += 'timeout';
                    cb();
                }, 100);
                setTimeout(() => {
                    hit += 'timeout';
                    expect(() => cb()).to.throw('Callback called more than once');
                }, 110);
            };
            route.run()
                .test()
                .then(err => {
                    if(err) throw err;
                    expect(hit).to.equal('timeout');
                    hit += 'done';
                    setTimeout(() => {
                        expect(hit).to.equal('timeoutdonetimeout');
                        done();
                    }, 100);
                });
        });
        
        it('should ignore callbacks responses if the route handler throws before returning', done => {
            var route = new Router();
            var hit = '';
            var error = new Error('error');
            
            route.test = function(){
                setTimeout(this.cbe(() => {
                    hit += '1';
                }), 50);
                
                throw error;
            };
            
            route.run()
                .test()
                .then(err => {
                    expect(hit).to.equal('');
                    expect(err).to.equal(error);
                    
                    // wait until long after the callbacks should have fired
                    setTimeout(() => {
                        expect(hit).to.equal('');
                        done();
                    }, 120);
                });
        });
    });
    
    
    
    /*it('should throw if async not closed', done => {
        var route = new Router();
        route.test = function(){};
        route.test2 = function(){};
        route.run()
            .async()
                .test()
                .test2();
    });*/
});