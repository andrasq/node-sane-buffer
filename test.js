/*
 * Copyright (C) 2019 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var SysBuffer = require('buffer').Buffer;
var OBuffer = require('./');
var nodeVersion = parseInt(process.version.slice(1));
var realVersion = process.version;

OBuffer._install();

module.exports = {
    tearDown: function(done) {
        setVersion(realVersion);
        done();
    },

    'should uninstall': function(t) {
        OBuffer._uninstall();
        t.equal(Buffer, SysBuffer);
        OBuffer._install();
        t.done();
    },

    'should install': function(t) {
        OBuffer._uninstall();
        OBuffer._install();
        t.equal(Buffer, OBuffer);
        t.done();
    },

    'should construct Buffer from string': function(t) {
        var buf = new OBuffer("hello");
        t.ok(buf instanceof SysBuffer);
        t.ok(buf instanceof OBuffer);
        t.ok(buf instanceof SysBuffer);
        t.done();
    },

    'should construct Buffer as a function': function(t) {
        var buf = OBuffer("hello");
        t.ok(buf instanceof SysBuffer);
        t.ok(buf instanceof Buffer);
        t.ok(buf instanceof OBuffer);
        t.done();
    },

    'should return length': function(t) {
        t.equal(OBuffer("hi").length, 2);
        t.equal(OBuffer(4).length, 4);
        t.done();
    },

    'should expose Buffer class methods': function(t) {
        for (var name in SysBuffer) {
            // the factory methods have been polyfilled
            if (name in { from: 1, alloc: 1, allocUnsafe: 1, concat: 1, allocUnsafeSlow: 1 }) continue;
            if (typeof SysBuffer[name] === 'function') t.equal(OBuffer[name], SysBuffer[name]);
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
        var Buff = require('./');
        t.throws(function() { new Buff() });

        t.unrequire('./');
        setVersion('v8.11.4');
        var Buff = require('./');
        t.throws(function() { new Buff() });

        // after deprecation
        t.unrequire('./');
        setVersion('v11.0.0');
        var Buff = require('./');
        t.throws(function() { new Buff() });

        t.done();
    },

    'edge cases': {
        setUp: function(done) {
            this.savedMethods = {};
            for (var k in SysBuffer) {
                Object.defineProperty(this.savedMethods, k, Object.getOwnPropertyDescriptor(SysBuffer, k));
            }
            done();
        },

        tearDown: function(done) {
            for (var k in this.savedMethods) Object.defineProperty(SysBuffer, k, Object.getOwnPropertyDescriptor(this.savedMethods, k));
            done();
        },

        'should throw with no args': function(t) {
            t.throws(function(){ OBuffer() }, /must|needs/);
            t.done();
        },

        'should use polyfills as necessary': function(t) {
            // test polyfill handling and coverage by faking the node version
            // the version trick will work with node v6-v9, or v10-v11 with deprecation warnings
            if (nodeVersion <= 5 || nodeVersion >= 10) t.skip();

            // before factory methods
            setVersion('v5.8.0');
            t.unrequire('./');
            var OBuff = require('./');
            testPolyfill(OBuff);

            // with both
            setVersion('v9.8.0');
            t.unrequire('./');
            var OBuff = require('./');
            testPolyfill(OBuff);

            // after deprecation
            setVersion('v11.0.0');
            t.unrequire('./');
            var OBuff = require('./');
            testPolyfill(OBuff);

            function testPolyfill(OBuffer) {
                var tempVersion = parseInt(process.version.slice(1));

                t.ok(typeof OBuffer.from === 'function');
                t.ok(typeof OBuffer.alloc === 'function');
                t.ok(typeof OBuffer.allocUnsafe === 'function');
                t.ok(OBuffer.from != SysBuffer.from);
                t.ok(OBuffer.alloc != SysBuffer.alloc);
                t.ok(OBuffer.allocUnsafe != SysBuffer.allocUnsafe);

                var buf = OBuffer.from("hello");
                t.ok(buf instanceof SysBuffer);
                t.deepEqual(buf, new OBuffer("hello"));

                var emptyBuf = new OBuffer(7); emptyBuf.fill(0);
                var buf = OBuffer.alloc(7);
                t.ok(buf instanceof SysBuffer);
                t.deepEqual(buf, emptyBuf);

                var buf = OBuffer.allocUnsafe(7);
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 7);

                var buf = OBuffer.from(makeSysBuffer(""));
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 0);

                var buf = OBuffer.from("");
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 0);

                var buf = OBuffer.alloc(0);
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 0);

                var buf = OBuffer.allocUnsafe(0);
                t.ok(buf instanceof SysBuffer);
                t.equal(buf.length, 0);

                OBuffer.safe = true;
                var buf = new OBuffer(777);
                t.equal(buf.length, 777);
                for (var i=0; i<777; i++) t.equal(buf[i], 0);

                var buf = new OBuffer([0x41, 0x42, 0x43]);
                t.equal(buf.toString(), "ABC");

                var arr = new ArrayBuffer(7);
                var buf = new OBuffer(arr, 0, 5);
                for (var i=0; i<7; i++) buf[i] = 65 + i;
                t.equal(buf.toString(), "ABCDE");
                var buf2 = makeSysBuffer(buf);
                t.equal(buf2.toString(), "ABCDE");
                // FIXME: what should arr convert to after was modified?  getting len 5 string
                // var buf3 = new OBuffer(arr, 0, 7);
                // t.equal(buf2.toString().length, "ABCDE");

                var buf = new OBuffer(new OBuffer("ABC"));
                t.equal(buf.toString(), "ABC");

                t.throws(function() { new OBuffer(/^/) });
            }

            t.done();
        },

        'should wrapper builders': function(t) {
            OBuffer._uninstall();

            setVersion('v5.8.0');
            t.unrequire('./');
            var OBuff = require('./');

            if (SysBuffer.concat) {
                t.ok(!OBuff.allocUnsafeSlow);
                var buf = OBuff.concat([makeSysBuffer('A'), makeSysBuffer('B')]);
                t.ok(buf instanceof OBuff);
                t.ok(buf instanceof Buffer);
            }

            // note: spoofing node-v6,7,8,9 can result in a deprecation warning
            setVersion('v10.8.0');
            t.unrequire('./');
            var OBuff = require('./');

            if (SysBuffer.allocUnsafeSlow) {
                t.ok(typeof OBuff.allocUnsafeSlow === 'function');
                t.ok(OBuff.allocUnsafeSlow(0) instanceof OBuff);
            }
            if (SysBuffer.concat) {
                OBuff._install();
                t.ok(Buffer.concat([makeSysBuffer('A'), makeSysBuffer('B')]) instanceof OBuff);
            }

            OBuffer._install();
            t.done();
        },

        'makes only Buffer instances into OBuffer': function(t) {
            OBuffer._install();
            var obj = new Date();
            // OBuffer.concat calls Buffer.concat and patches the result Buffer
            t.stubOnce(SysBuffer, 'concat', function() { return obj });
            if (SysBuffer.concat) {
                var buf = Buffer.concat([new Buffer('A'), new Buffer('B')]);
                t.ok(!(buf instanceof OBuffer));
                t.equal(buf, obj);
            }
            t.done();
        },
    },

    'interoperability': {
        'should concat Buffers': function(t) {
            if (SysBuffer.concat) {
                var buf = OBuffer.concat([new Buffer("A"), makeSysBuffer("B"), new OBuffer("C")]);
                t.equal(buf.toString(), "ABC");
                t.ok(buf instanceof SysBuffer);
                t.ok(buf instanceof Buffer);
                t.ok(buf instanceof OBuffer);
            }
            t.done();
        },

        'should access contents with subscript notation': function(t) {
            var buf = OBuffer("ABC");
            t.equal(buf.length, 3);
            t.equal(buf[0], 65);
            t.equal(buf[1], 66);
            t.equal(buf[2], 67);
            t.done();
        },

        'should run swap16': function(t) {
            var buf = OBuffer([1, 2, 3, 4]);
            if (buf.swap16) t.equal(buf.swap16(), buf);
            t.done();
        },

        'should slice like Buffer': function(t) {
            var buf;

            buf = OBuffer("hello").slice(2, 4);
            t.equal(buf.toString(), "ll");
            t.ok(buf instanceof SysBuffer);
            t.ok(buf instanceof OBuffer);

            buf = OBuffer("hello").slice(1);
            t.equal(String(buf), "ello");

            buf = OBuffer("hello").slice(0);
            t.equal(buf + '', "hello");

            t.done();
        },

        'should support byteLength': function(t) {
            t.equal(OBuffer.byteLength("hi\u9876"), 5);
            t.done();
        },

        'should support keys and values': function(t) {
            var buf = OBuffer("ABCD");
            t.equal(buf.length, 4);
            var keys = [], values = [];
            // keys and values return iterators, which need for..of, introduced in 0.12
            try { eval("for (var key of buf.keys()) keys.push(key);") } catch (e) { }
            try { eval("for (var value of buf.values()) values.push(key);") } catch (e) { }
            if (keys.length > 0) t.deepEqual(keys, [0, 1, 2, 3]);
            if (values.length > 0) t.deepEqual(values, [65, 66, 67, 68]);
            t.done();
        },

        'should support read and write': function(t) {
            var buf = new OBuffer("oh hello world, have a good day.");

            t.equal(buf.write("hit", 3, 2, 'utf8'), 2);
            t.equal(buf.slice(1, 8).toString(), 'h hillo');
            t.equal(buf.toString(undefined, 3, 3+2), 'hi');

            buf.writeDoubleBE(1e6, 1);
            t.equal(buf.readDoubleBE(1), 1e6);

            t.done();
        },

        'should support toJSON': function(t) {
            var buf = OBuffer([1, 2]);
            if (!buf.toJSON && nodeVersion < 1) t.skip();  // not in node-v0.8
            var json = buf.toJSON();
            t.equal(typeof json, 'object');
            if (json.type) t.deepEqual(json, { type: 'Buffer', data: [1, 2] }); // node-v0.11
            else t.deepEqual(json, [1, 2]);     // node-v0.10
            t.done();
        },
    },

    'speed OBuffer': {
        setUp: function(done) {
            this.Buffer = OBuffer;
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
// Note: this will print a deprecation warning on node-v10 and up.
if (nodeVersion < 10) {
    module.exports['speed Buffer'] = _copyObject({}, module.exports['speed OBuffer']);
    module.exports['speed Buffer'].setUp = function(done) { this.Buffer = SysBuffer; done() };
}

function _copyObject(to, from) {
    for (var k in from) to[k] = from[k];
    return to;
}

function makeSysBuffer(a, b, c) {
    // node-v4.4 and v5.8 had a weird from() that broke on strings with "not a typed array" error
    // all node versions mis-handle Buffer(new Number(1)) and Buffer.alloc(new Number(1)):
    //   0.10, 0.11 and 0.12 alloc 0 bytes, 4.4 on up throw an error
    if (nodeVersion < 10) return new SysBuffer(a, b, c);
    return (typeof a === 'number') ? SysBuffer.alloc(a) : SysBuffer.from(a, b, c);
}

function setVersion(ver) {
    Object.defineProperty(process, 'version', { value: ver });
}
