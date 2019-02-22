/*
 * Change Buffer to implement the legacy Buffer constructor.
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
    return _typeconvert(OBuffer.create(arg, encOrOffs, length));
}
util.inherits(OBuffer, Buffer);

// wrapper instance builder methods too (do after the inerits, old node clears prototype)
OBuffer.prototype.slice = function(base, bound) { return _typeconvert(Buffer.prototype.slice.call(this, base, bound)) };

// copy class methods and properties
for (var k in Buffer) OBuffer[k] = Buffer[k];
OBuffer.Buffer = OBuffer;
OBuffer._Buffer = Buffer;

// polyfills for builders on node versions that need it, each returning OBuffer
OBuffer.from = _typewrapper('from', function(a, b, c) { return new OBuffer(a, b, c) });
OBuffer.alloc = _typewrapper('alloc', function(n) { return _fill0(new OBuffer(n)) });
OBuffer.allocUnsafe = _typewrapper('allocUnsafe', function(n) { return new OBuffer(n) });
OBuffer.allocUnsafeSlow = (nodeVersion >= 6 && Buffer.allocUnsafeSlow) ? function(size) { return _typeconvert(Buffer.allocUnsafeSlow(size)) } : undefined;
OBuffer.concat = function(list, length) { return _typeconvert(Buffer.concat(list, length)) };

// class properties and class methods
OBuffer.safe = false;
OBuffer.install = function() { global.Buffer = OBuffer }
OBuffer.uninstall = function() { global.Buffer = Buffer }
OBuffer.create = function create( arg, encOrOffs, length ) {
    // node through v9 supported the old constructor semantics, 10 and up deprecate it
    return (
        (nodeVersion < 10) ? (OBuffer.safe && _isNumber(arg)) ? _fill0(new Buffer(arg)) : new Buffer(arg, encOrOffs, length) :
        _isNumber(arg)     ? (OBuffer.safe ? Buffer.alloc(arg) : Buffer.allocUnsafe(arg)) :
                             Buffer.from(arg, encOrOffs, length)
    )
}

// monkeypatch the object to make it intanceof OBuffer
function _typeconvert(obj) { if (obj && obj.constructor === Buffer) obj.__proto__ = OBuffer.prototype; return obj }

// wrapper the function to return an OBuffer
function _typewrapper(name, poly) { return (nodeVersion >= 6 && Buffer[name]) ? function(a, b, c) { return _typeconvert(Buffer[name](a, b, c)) } : poly }

// polyfill for .fill(0)
function _fill0(buf) { var len = buf.length; for (var i=0; i<len; i++) buf[i] = 0; return buf }

function _isNumber(x) { return x != null && x.constructor === Number }
