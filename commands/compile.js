
var lijsp = require('../lijsp'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    util = require('../util'),
    mkdirp = require('mkdirp'),
    exec = require('child_process').exec,
    lispGlobal = util.getGlobal() || {},
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
    data = '(*import-all-globals*) ' + data;
    var stream = lijsp.compile(data, {
      appDir: appDir,
      appName: appName,
      currentFile: path.join(appName, path.relative(appDir, fname)),
      expander: lispGlobal.lisp_expander,
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

  var uglifyRewrite = function (data, opts, file) {
    if (UglifyJS) {
      if (!opts) {
        opts = {};
      }
      opts.fromString = true;
      try {
        data = UglifyJS.minify(data, opts).code;
      } catch (e) {
        console.error(file, e);
        console.error(data)
      }
    }
    return data;
  };

  var prettifyOutput = function (data, file) {
    return uglifyRewrite(data, {
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
    }, file);
  };

  var optimizeOutput = function (data, file) {
    return uglifyRewrite(data, {
      compress: {
        warnings: true,
        unused: true
      }
    }, file);
  };

  var getCompiledFname = function (fpath) {
    fpath = path.normalize(fpath);
    return path.relative(appDir, path.resolve(fpath)) + '.js';
  };

  var getCompiledFpath = function (fpath, outdir, fpathIsCompiled) {
    return path.join(
      outdir, fpathIsCompiled ? fpath : getCompiledFname(fpath));
  };

  var appendToOutput = function (err, fpath, outdir, data, cb) {
    handleError(err);
    if (isGlobalFile(fpath)) {
      cb && cb();
      return;
    }
    if (args.pretty) {
      data = prettifyOutput(data, fpath) + '\n\n';
    } else if (args.optimized) {
      data = optimizeOutput(data, fpath);
    }
    if (outdir) {
      var jsFname, jsFpath;
      if (fpath) {
        jsFname = getCompiledFname(fpath);
      } else {
        // fpath should only be blank if compiling from stdin
        jsFname = 'compiled-lijsp.js';
      }
      jsFpath = getCompiledFpath(jsFname, outdir, true);
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

  var createPackage = function (mainFile) {
    if (outdir) {
      var lijspDir = path.join(__dirname, '..');
      var nmDir = path.join(outdir, 'node_modules');
      mkdirp(nmDir, function (err) {
        handleError(err);

        var pjsonFile = path.join(outdir, 'package.json');
        fs.readFile(pjsonFile, 'utf8', function (err, data) {
          if (err && err.code !== 'ENOENT') {
            handleError(err);
          }
          var pjson = data ? JSON.parse(data) : {};
          if (mainFile) {
            pjson.main = path.basename(mainFile) + '.js';
          }
          var pjsonString = JSON.stringify(pjson, null, 2);

          fs.writeFile(pjsonFile, pjsonString, handleError);
          var dest = path.join(nmDir, 'lijsp');
          fs.exists(dest, function (exists) {
            if (!exists) {
              fs.symlink(lijspDir, dest, 'dir', handleError);
            }
          });
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

  var fileOlderThan = function (f1, f2) {
    if (fs.existsSync(f1) && fs.existsSync(f2)) {
      var stat1 = fs.statSync(f1);
      var stat2 = fs.statSync(f2);
      console.log(f1, stat1.mtime, '<>', f2, stat2.mtime);
      return stat1.mtime < stat2.mtime;
    }
    return false;
  };

  // Compilation needs to be syncronous.
  var compileFile = function (f, cb) {
    var err, data, fCompiled;
    console.log('Compiling ' + f);
    fCompiled = getCompiledFpath(f, outdir);
    var alreadyCompiled;
    if (f in compiledFiles ||
        (alreadyCompiled = fileOlderThan(f, fCompiled))) {
      console.log('  Using previous result. Nothing to do.');
      if (alreadyCompiled) {
        try {
          require(fCompiled);
        } catch (e) {
          console.warn('Failed trying to require previously compiled file '
                       + fCompiled + ':', e);
        }
      }
      cb && cb();
    } else {
      try {
        data = fs.readFileSync(f, 'utf8');
      } catch (e) {
        err = e;
      }
      compileOne(err, f, data, makeOutputAppender(f, outdir, function (err) {
        handleError(err);
        cb && cb.apply(this, arguments);
      }));
    }
  };


  var re_isNodeModules = /(^|\/)node_modules$/;
  var walk = function (item, cb) {
    fs.stat(item, function (err, stats) {
      handleError(err);
      if (stats.isFile()) {
        cb(item);
      } else if (stats.isDirectory()) {
        if (re_isNodeModules.test(item)) {
          return;
        }
        fs.readdir(item, function (err, items) {
          handleError(err);
          for (var i = 0, len = items.length; i < len; i++) {
            walk(path.join(item, items[i]), cb);
          }
        });
      }
    });
  };

  var re_isLijsp = /\.lijsp$/;

  var outdir = args.outdir;
  var appDir, appName;
  var start = function (err) {
    handleError(err);
    if (args.input) {
      fs.stat(args.input, function (err, stats) {
        handleError(err);
        if (stats.isDirectory()) {
          appDir = args.input;
          appName = path.basename(appDir);
          var main = path.join(args.input, 'main.lijsp');
          fs.stat(main, function (err, stats) {
            if ((err && err.code === 'ENOENT') ||
                (stats && !stats.isFile())) {
              createPackage();
            } else {
              handleError(err);
              createPackage(main);
            }
            walk(args.input, function (f) {
              if (re_isLijsp.test(f)) {
                compileFile(f);
              }
            });
          });
        } else if (stats.isFile()) {
          createPackage(args.input);
          appDir = path.dirname(args.input);
          appName = path.basename(appDir);
          compileFile(args.input);
        }
      });
    } else {
      compileStdin(makeOutputAppender(null, outdir, handleError));
    }
  };

  // Kick off the compiling
  start();
};
