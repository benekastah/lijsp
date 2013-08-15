
var lijsp = require('../lijsp'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    UglifyJS;

// Don't fail if optional dependency is not met
try {
  UglifyJS = require('uglify-js');
} catch (e) {}

exports.execute = function (args) {
  args.verbose && !UglifyJS && console.warn('uglify-js not found');

  var handleError = function (err) {
    if (err) {
      process.nextTick(function () {
        process.exit(-1);
      });
      throw err;
    }
  };

  var compileOne = function (err, fname, data, cb) {
    handleError(err);
    var stream = lijsp.compileString(data, {
      appDir: appDir,
      currentFile: fname,
      fileCompiler: function (f) {
        var parts = f.split(path.sep);
        assert.equal(appDir, parts.shift());
        f = path.join.apply(path, parts) + '.lijsp';
        if (fname) {
          f = path.resolve(path.dirname(fname), f);
        }
        compileFile(f);
      }
    });
    cb(err, stream.data);
  };

  var prettifyOutput = function (data) {
    if (UglifyJS) {
      try {
        return UglifyJS.minify(data, {
          fromString: true,
          warnings: args.verbose,
          mangle: false,
          output: {
            beautify: true,
            indent_level: args.indentLevel,
            comments: true
          },
          compress: {
            hoist_vars: true,
            hoist_funs: true,
            join_vars: false,
            sequences: false,
            drop_debugger: false,
            unused: true
          }
        }).code;
      } catch (e) {
        console.error(e);
      }
    }
    return data;
  };

  var appendToOutput = function (err, fpath, outdir, data, cb) {
    handleError(err);
    data = prettifyOutput(data) + '\n\n';
    if (outdir) {
      // fpath should only be blank if compiling from stdin
      var jsFname;
      if (fpath) {
        jsFname = path.relative(appDir, path.resolve(fpath)) + '.js';
      } else {
        jsFname = 'compiled-lijsp.js';
      }
      var jsFpath = path.join(outdir, jsFname);
      fs.writeFile(jsFpath, data, cb);
    } else {
      process.stdout.write(data, cb);
    }
  };

  var makeOutputAppender = function (fpath, outdir, cb) {
    return function (err, data) {
      appendToOutput(err, fpath, outdir, data, cb);
    };
  };

  var compileStdin = function (cb) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    var compilerInput = '';
    process.stdin.on('data', function (data) {
      compilerInput += data;
    });

    process.stdin.on('end', function () {
      compileOne(null, null, compilerInput, cb);
    });

    process.stdin.on('error', handleError);
  };

  var compileFile = function (f, cb) {
    fs.readFile(f, 'utf8', function (err, data) {
      compileOne(err, f, data, makeOutputAppender(f, outdir, function () {
        handleError.apply(this, arguments);
        cb && cb.apply(this, arguments);
      }));
    });
  };

  // Kick off the compiling
  var outdir = args.outdir;
  var appDir;
  if (args.file) {
    appDir = path.dirname(args.file);
    compileFile(args.file);
  } else {
    compileStdin(makeOutputAppender(null, outdir, handleError));
  }
};
