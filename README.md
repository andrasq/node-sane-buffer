sane-buffer
===========

Fix the `Buffer` constructor semantics to not break legacy code.  Unlike packages that
polyfill the new API, this one polyfills both new (for older nodejs that is missing calls)
and the old (for new nodejs that made breaking changes).

The module wrappers `Buffer` to support the old constructor API.  Safe behavior can be
preserved by setting `require('sane-buffer').safe = true`.  The wrapper can be installed
globally, affecting sub-sub-sub dependencies as well, or can be used per-file.

The wrapper has polyfills for the new Buffer builder functions `from`, `alloc`, `allocUnsafe`,
and polyfills for the old Buffer constructor `new Buffer(10)`, `new Buffer("string")`, etc.

As with all things nodejs, your mileage may vary, buyer beware.

    Buffer("test")
    // => [DEP0005] DeprecationWarning: Buffer() is deprecated

    require('sane-buffer')._install();

    Buffer("test");
    // => <Buffer 74 65 73 74>


API
---

### OBuffer = require('sane-buffer')

Load the Buffer API wrappers.  OBuffers can be created and used just like Buffers.

OBuffer has polyfills for `Buffer.from`, `Buffer.alloc` and `Buffer.allocUnsafe` to make them
work on all versions of node (tested down to v0.6).  The polyfills delegate to the Buffer
constructor if possible, else to the underlying factory methods.  This avoids the quirky
behavior of some early factory methods, eg node-v4.4 and v5.8 breaking on `Buffer.from("a")`
with "is not a typed array".

### OBuffer.safe

Flag that controls whether `new Buffer(10)` initial contents will contain random bytes or will
be cleared to zeroes.  Default is `false`, random bytes.

The "unsafe" part of `Buffer` semantics was that `new Buffer(100)` returns 100 bytes that contains
leftover data from a different call, perhaps leaking data from a different user.  Setting
`OBuffer.safe = true` upon `_install` changes that behavior so that every `new Buffer(100)` will
return a buffer with all bytes cleared to zeros.  Whether every `new Buffer(1000000)` really
needs to be pre-zeroed every time before being overwritten is an exercise left to the reader.

### OBuffer._install( )

Change the global Buffer implementation to OBuffer.  Buffers created from this point on will
be of type `OBuffer` (for "old buffer", real clever huh).  OBuffers are Buffers by a different
name, interoperate with Buffers, and are `instanceof Buffer`.  Reversible with `_uninstall`.

### OBuffer._uninstall( )

Restore the global Buffer to the original that it was when `sane-buffer` was loaded.

### OBuffer._create( arg, [encodingOrOffset, [length]] )

The factory used internally by the constructor to construct new Buffers.  The factory either
uses `new Buffer` or calls a factory method, depending on which is supported in this version
of nodejs.


Testing
-------

To run the unit tests, check out the [repo](https://github.com/andrasq/node-sane-buffer).


Change Log
----------

- 0.9.0 - initial version


Related Work
------------

- safe-buffer
- safer-buffer
