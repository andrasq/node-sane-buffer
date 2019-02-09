/*
 * Copyright (C) 2019 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var SysBuffer = require('buffer').Buffer;
var Boffur = require('./');
var nodeVersion = parseInt(process.version.slice(1));
var realVersion = process.version;

module.exports = {
    tearDown: function(done) {
        setVersion(realVersion);
        done();
    },

    'should uninstall': function(t) {
        Boffur._uninstall();
        t.equal(Buffer, SysBuffer);
        t.done();
    },

    'should install': function(t) {
        Boffur._uninstall();
        Boffur._install();
        t.equal(Buffer, Boffur);
        t.done();
    },

    'should construct Buffer from string': function(t) {
        var buf = new Boffur("hello");
        t.ok(buf instanceof SysBuffer);
        t.ok(buf instanceof Boffur);
        t.ok(buf instanceof SysBuffer);
        t.done();
    },

    'should construct Buffer as a function': function(t) {
        var buf = Boffur("hello");
        t.ok(buf instanceof SysBuffer);
        t.ok(buf instanceof Buffer);
        t.ok(buf instanceof Boffur);
        t.done();
    },

    'should return length': function(t) {
        t.equal(Boffur("hi").length, 2);
        t.equal(Boffur(4).length, 4);
        t.done();
    },

    'should expose Buffer class methods': function(t) {
        for (var name in SysBuffer) {
            // the factory methods have been polyfilled
            if (name in { from: 1, alloc: 1, allocUnsafe: 1, concat: 1, allocUnsafeSlow: 1 }) continue;
            if (typeof SysBuffer[name] === 'function') t.equal(Boffur[name], SysBuffer[name]);
        }
        t.done();
    },

    'should create by count': function(t) {
        var buf = Buffer(234);
        t.ok(buf instanceof SysBuffer);
        t.equal(buf.length, 234);
        t.done();
    },

    'should create by string': function(t) {
        var buf = new Buffer("hello");
        t.equal(buf.length, 5);
        t.equal(buf[1], 'e'.charCodeAt(0));
        var buf = new Buffer("1234", 'hex');
        t.equal(buf.length, 2);
        t.equal(buf[0], 0x12);
        t.done();
    },

    'should create by Array': function(t) {
        var buf = new Buffer([1, 2, 3]);
        t.equal(buf.length, 3);
        t.equal(buf[1], 2);
        t.equal(buf[2], 3);
        var buf = new Buffer([]);
        t.equal(buf.length, 0);
        var buf = new Buffer([1234]);
        t.equal(buf.length, 1);
        t.equal(buf[0], 1234 & 0xFF);
        t.done();
    },

    'should create by Buffer': function(t) {
        var buf = Buffer([1, 2]);
        var buf2 = new Buffer(buf);
        t.notEqual(buf2, buf);
        t.equal(buf2.length, 2);
        t.equal(buf2[0], 1);
        t.equal(buf2[1], 2);
        t.done();
    },

    'should require constructor argument': function(t) {
        if (nodeVersion <= 5 || nodeVersion >= 10) t.skip();

        // before factory methods
        t.unrequire('./');
        setVersion('v5.8.0');
        var Buffer = require('./');
        t.throws(function() { new Buffer() });

        t.unrequire('./');
        setVersion('v8.11.4');
        var Buffer = require('./');
        t.throws(function() { new Buffer() });

        // after deprecation
        t.unrequire('./');
        setVersion('v11.0.0');
        var Buffer = require('./');
        t.throws(function() { new Buffer() });

        t.done();
    },

    'edge cases': {
        setUp: function(done) {
            Boffur._uninstall();
            this.savedMethods = {};
            for (var k in SysBuffer) {
                Object.defineProperty(this.savedMethods, k, Object.getOwnPropertyDescriptor(SysBuffer, k));
            }
            done();
        },

        tearDown: function(done) {
            for (var k in this.savedMethods) Object.defineProperty(SysBuffer, k, Object.getOwnPropertyDescriptor(this.savedMethods, k));
            Boffur._install();
            done();
        },

        'should throw with no args': function(t) {
            t.throws(function(){ Boffur() }, /must|needs/);
            t.done();
        },

        'should use polyfills as necessary': function(t) {
            // test polyfill handling and coverage by faking the node version
            // the version trick will only work with node v6-v9, or v10-v11 with deprecation warnings
            if (nodeVersion <= 5 || nodeVersion >= 10) t.skip();

            // before factory methods
            setVersion('v5.8.0');
            t.unrequire('./');
            var Boffur = require('./');
            testPolyfill();

            // after deprecation
            setVersion('v11.0.0');
            t.unrequire('./');
            var Boffur = require('./');
            testPolyfill();

            function testPolyfill() {
                var tempVersion = parseInt(process.version.slice(1));

                t.ok(typeof Boffur.from === 'function');
                t.ok(typeof Boffur.alloc === 'function');
                t.ok(typeof Boffur.allocUnsafe === 'function');
                t.ok(Boffur.from != SysBuffer.from);
                t.ok(Boffur.alloc != SysBuffer.alloc);
                t.ok(Boffur.allocUnsafe != SysBuffer.allocUnsafe);

                var buf = Boffur.from("hello");
                t.ok(buf instanceof SysBuffer);
                t.deepEqual(buf, new Boffur("hello"));

                var emptyBuf = new Boffur(7); emptyBuf.fill(0);
                var buf = Boffur.alloc(7);
                t.ok(buf instanceof SysBuffer);
                t.deepEqual(buf, emptyBuf);

                var buf = Boffur.allocUnsafe(7);
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 7);

                Boffur.safe = true;
                var buf = new Boffur(777);
                for (var i=0; i<777; i++) t.equal(buf[i], 0);

                var buf = new Boffur([0x41, 0x42, 0x43]);
                t.equal(buf.toString(), "ABC");

                var arr = new ArrayBuffer(7);
                var buf = new Boffur(arr, 0, 5);
                for (var i=0; i<7; i++) buf[i] = 65 + i;
                t.equal(buf.toString(), "ABCDE");
                var buf2 = makeSysBuffer(buf);
                t.equal(buf2.toString(), "ABCDE");

                var buf = new Boffur(new Boffur("ABC"));
                t.equal(buf.toString(), "ABC");

                t.throws(function() { new Boffur(/^/) });
            }

            t.done();
        },

        'should wrapper builders': function(t) {
            setVersion('v5.8.0');

            if (SysBuffer.concat) {
                t.unrequire('./');
                var Boffur = require('./')._install();
                t.ok(!Boffur.allocUnsafeSlow);
                var buf = Buffer.concat([new Buffer('A'), new Buffer('B')]);
                t.ok(buf instanceof Boffur);
            }

            setVersion('v9.8.0');

            if (SysBuffer.allocUnsafeSlow) {
                t.unrequire('./');
                var Boffur = require('./')._install();
                t.ok(typeof Boffur.allocUnsafeSlow === 'function');
                t.ok(Boffur.allocUnsafeSlow(0) instanceof Boffur);
            }
            if (SysBuffer.concat) {
                t.ok(Buffer.concat([new Buffer('A'), new Buffer('B')]) instanceof Boffur);
            }

            t.done();
        },

        'only makes Buffers instances of OBuffer': function(t) {
            var obj = {};
            Boffur._install();
            // OBuffer.concat calls Buffer.concat and patches the result Buffer
            t.stubOnce(SysBuffer, 'concat', function() { return obj });
            if (SysBuffer.concat) {
                var buf = Buffer.concat([new Buffer('A'), new Buffer('B')]);
                t.ok(!(buf instanceof Boffur));
                t.equal(buf, obj);
            }
            t.done();
        },
    },

    'interoperability': {
        'should work as Buffer': function(t) {
            if (SysBuffer.concat) {
                var buf = Boffur.concat([new Buffer("A"), makeSysBuffer("B"), new Boffur("C")]);
                t.equal(buf.toString(), "ABC");
                t.ok(buf instanceof SysBuffer);
                t.ok(buf instanceof Buffer);
                t.ok(buf instanceof Boffur);
            }

            var buf = Boffur("hello").slice(2, 4);
            t.equal(buf.toString(), "ll");
            t.ok(buf instanceof SysBuffer);
            t.ok(buf instanceof Boffur);

            var buf = Boffur("ABC");
            t.equal(buf[0], 65);
            t.equal(buf[1], 66);
            t.equal(buf[2], 67);

            var buf = Boffur([1, 2, 3, 4]);
            if (buf.swap16) t.ok(buf.swap16(), buf);

            t.done();
        }
    },

    'speed OBuffer': {
        setUp: function(done) {
            this.Buffer = Boffur;
            done();
        },

        'create new 100k': function(t) {
            for (var x, i=0; i<100000; i++) x = new this.Buffer(10);
            // Buffer is 45% faster than OBuffer
            t.done();
        },

        'iterate 10m': function(t) {
            var len = 100, buf = new this.Buffer(len);
            for (var x, i=0; i<100000; i++) for (var j=0; j<len; j++) x = buf[j];
            // same speed
            t.done();
        },

        'for..of 10m': function(t) {
            if (nodeVersion < 4) t.skip();
            var x, buf = new this.Buffer(100);
            eval("for (var i=0; i<100000; i++) for (var v of buf) x = v;");
            // same speed
            t.done();
        },

        'slice 100k': function(t) {
            var x, buf = new this.Buffer(100);
            for (var i=0; i<100000; i++) x = buf.slice(i % 100);
            // Buffer is 135% faster than OBuffer (unoptimized __proto__)
            t.done();
        },
    },
}

// run the OBuffer speed tests on Buffers too
module.exports['speed Buffer'] = _copyObject({}, module.exports['speed OBuffer']);
module.exports['speed Buffer'].setUp = function(done) { this.Buffer = SysBuffer; done() };

function _copyObject(to, from) {
    for (var k in from) to[k] = from[k];
    return to;
}

function makeSysBuffer(a, b, c) {
    // node-v4.4 and v5.8 had a weird from() that broke on strings with "not a typed array" error
    if (nodeVersion < 10) return new SysBuffer(a, b, c);
    return (typeof a === 'number') ? SysBuffer.alloc(a) : sysBuffer.from(a, b, c);
}

function setVersion(ver) {
    Object.defineProperty(process, 'version', { value: ver });
}
