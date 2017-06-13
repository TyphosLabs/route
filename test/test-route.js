/* globals describe, it */

const Chai = require('chai');
const expect = Chai.expect;

const Route = require('../index.js');

describe('route', () => {
    it('should be a constructor', () => {
        expect(Route).to.be.a('function');
        expect(() => new Route()).not.to.throw();
    });
    
    it('should allow routes to be attached', done => {
        var route = new Route();
        var hit = '';
        route.test = function(route){
            hit += 'test';
        };
        route.ready();
        route
            .test()
            .finally((err, result) => {
                expect(err).to.equal(undefined);
                expect(hit).to.equal('test');
                done();
            });
    });
    
    it('should catch thrown errors in route handlers', done => {
        var route = new Route();
        var error = new Error('test');
        route.test = function(route){
            throw error;
        };
        route.ready();
        route
            .test()
            .finally((err, result) => {
                expect(err).to.equal(error);
                done();
            });
    });
    
    describe('.ready()', () => {
        it('should be chainable', done => {
                
            var route = new Route();
            var hit = '';
            route.test = function(route){
                hit += 'test';
            };
            route.ready()
                .test()
                .finally((err, result) => {
                    expect(err).to.equal(undefined);
                    expect(hit).to.equal('test');
                    done();
                });
        });
    });
});