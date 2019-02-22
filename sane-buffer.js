/*
 * Override Buffer globally to implement the legacy Buffer constructor.
 * Convenient for running legacy code without having to rewrite it all first.
 *
 * Copyright (C) 2019 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2919-01-17 - AR.
 */

'use strict'

var util = require('util');
var Buffer = require('buffer').Buffer;                  // inside this file, Buffer is the system class
var nodeVersion = parseInt(process.version.slice(1));   // version is mocked by unit tests

module.exports = OBuffer;

function OBuffer( arg, encOrOffs, length ) {
    // create as type Buffer, but patch it up to make it appear instanceof OBuffer
    return _typeconvert(OBuffer._create(arg, encOrOffs, length));
}
util.inherits(OBuffer, Buffer);

// wrapper instance builder methods too (do after the inerits, old node clears prototype)
OBuffer.prototype.slice = function(base, bound) { return _typeconvert(Buffer.prototype.slice.call(this, base, bound)) };

// copy class methods
for (var k in Buffer) OBuffer[k] = Buffer[k];
OBuffer.Buffer = OBuffer;
OBuffer._Buffer = Buffer;

// polyfills for builders on node versions that need it, each returning OBuffer
OBuffer.from = _typewrapper('from', function(a, b, c) { return new OBuffer(a, b, c) });
OBuffer.alloc = _typewrapper('alloc', function(n) { return _fill0(new OBuffer(n)) });
OBuffer.allocUnsafe = _typewrapper('allocUnsafe', function(n) { return new OBuffer(n) });
// patch returned Buffers to make them appear instanceof OBuffer
OBuffer.allocUnsafeSlow = (nodeVersion >= 6 && Buffer.allocUnsafeSlow) ? function(size) { return _typeconvert(Buffer.allocUnsafeSlow(size)) } : undefined;
OBuffer.concat = function(list, length) { return _typeconvert(Buffer.concat(list, length)) };

function _typeconvert(obj) { if (obj && obj.constructor === Buffer) obj.__proto__ = OBuffer.prototype; return obj }
function _typewrapper(name, poly) { return (nodeVersion >= 6 && Buffer[name]) ? function(a, b, c) { return _typeconvert(Buffer[name](a, b, c)) } : poly }
function _fill0(buf) { var len = buf.length; for (var i=0; i<len; i++) buf[i] = 0; return buf }

// class properties and class methods
OBuffer._safe = false;
OBuffer._install = function() { return global.Buffer = OBuffer }
OBuffer._uninstall = function() { global.Buffer = Buffer; return OBuffer }
OBuffer._create = function _create( arg, encOrOffs, length ) {
    // node through v9 supported the old constructor semantics, 10 and up deprecate it
    if (nodeVersion < 10) {
        if (OBuffer.safe && arg && arg.constructor === Number) return _fill0(new Buffer(arg));
        return new Buffer(arg, encOrOffs, length);
    }

     if (arg != null) {
        if (arg.constructor === String) return Buffer.from(arg, encOrOffs);
        else if (arg.constructor === Number) return OBuffer.safe ? Buffer.alloc(arg) : Buffer.allocUnsafe(arg);
        else if (arg instanceof Array || arg instanceof Buffer || arg && arg.length !== undefined) return Buffer.from(arg);
    }
    // handle everything else, including no-args errors, by the implementation (eg node-v8.2 allows objects)
    return new Buffer.from(arg, encOrOffs, length);
}
