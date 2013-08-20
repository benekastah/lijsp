
var lijsp = require('../lijsp'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    util = require('../util'),
    mkdirp = require('mkdirp'),
    exec = require('child_process').exec,
    globalRootDir = path.normalize(path.join(__dirname, '../lisp')),
    compilePath,
    UglifyJS;

// Don't fail if optional dependency is not met
try {
  UglifyJS = require('uglify-js');
} catch (e) {}

compilePath = [globalRootDir].
  concat((process.env['LIJSP_PATH'] || '').split(path.delimiter));

var isGlobalFile = function (f) {
  return util.startsWith(f, path.join(globalRootDir, '/'));
};

exports.execute = function (args) {
  args.verbose && !UglifyJS && console.warn('uglify-js not found');

  var handleError = function (err) {
    if (err) {
      process.nextTick(function () {
        process.exit(-1);
      });
      if (err.stack) {
        console.error(err.stack);
      }
      throw err;
    }
  };

  var compiledFiles = {};
  var compileOne = function (err, fname, data, cb) {
    handleError(err);
    compiledFiles[fname] = true;
    var stream = lijsp.compile(data, {
      appDir: appDir,
      appName: appName,
      currentFile: path.join(appName, path.relative(appDir, fname)),
      // Compilation should be syncronous
      fileCompiler: function (f) {
        var parts = f.split(path.sep),
            _compilePath = compilePath;
        if (appName === parts[0]) {
          parts.shift();
          _compilePath = [appDir];
        }
        var fullF = path.join.apply(path, parts) + '.lijsp';
        var compile = function () {
          compileFile(f);
        };
        for (var i = 0, len = _compilePath.length; i < len; i++) {
          var dir = _compilePath[i];
          f = path.join(dir, fullF);
          var stats = fs.statSync(f);
          if (stats.isFile()) {
            return compile();
          }
        }
        return compile();
      }
    });
    compiledFiles[fname] = stream;
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
    if (isGlobalFile(fpath)) {
      cb && cb();
      return;
    }
    data = prettifyOutput(data) + '\n\n';
    if (outdir) {
      var jsFname;
      if (fpath) {
        fpath = path.normalize(fpath);
        jsFname = path.relative(appDir, path.resolve(fpath)) + '.js';
      } else {
        // fpath should only be blank if compiling from stdin
        jsFname = 'compiled-lijsp.js';
      }
      var jsFpath = path.join(outdir, jsFname);
      var _outdir = path.dirname(jsFpath);
      mkdirp(_outdir, function (err) {
        handleError(err);
        fs.writeFile(jsFpath, data, cb);
      });
    } else {
      process.stdout.write(data, cb);
    }
  };

  var makeOutputAppender = function (fpath, outdir, cb) {
    return function (err, data) {
      appendToOutput(err, fpath, outdir, data, cb);
    };
  };

  var createPackage = function () {
    if (outdir) {
      var lijspDir = path.join(__dirname, '..');
      var nmDir = path.join(outdir, 'node_modules');
      mkdirp(nmDir, function (err) {
        handleError(err);
        exec('touch package.json', {cwd: outdir}, handleError);
        var dest = path.join(nmDir, 'lijsp');
        fs.exists(dest, function (exists) {
          if (!exists) {
            fs.symlink(lijspDir, dest, 'dir', handleError);
          }
        });
      });
    }
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

  // Compilation needs to be syncronous.
  var compileFile = function (f, cb) {
    var err, data;
    if (f in compiledFiles) {
      cb && cb();
      return;
    }
    try {
      data = fs.readFileSync(f, 'utf8');
    } catch (e) {
      err = e;
    }
    compileOne(err, f, data, makeOutputAppender(f, outdir, function (err) {
      handleError(err);
      cb && cb.apply(this, arguments);
    }));
  };


  var outdir = args.outdir;
  var appDir, appName;
  var start = function (err) {
    handleError(err);
    createPackage();
    if (args.file) {
      appDir = path.dirname(args.file);
      appName = path.basename(appDir);
      compileFile(args.file);
    } else {
      compileStdin(makeOutputAppender(null, outdir, handleError));
    }
  };

  // Kick off the compiling
  start();
};
