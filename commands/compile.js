
var lijsp = require('../lijsp'),
    fs = require('fs'),
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

  var compileOne = function (err, data, cb) {
    handleError(err);
    var stream = lijsp.compileString(data);
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

  var firstWrite;
  var appendToOutput = function (err, outfile, data, cb) {
    handleError(err);
    data = prettifyOutput(data) + '\n\n';
    if (outfile) {
      if (!firstWrite) {
        fs.writeFile(outfile, data, cb);
        firstWrite = true;
      } else {
        fs.appendFile(outfile, data, cb);
      }
    } else {
      process.stdout.write(data, cb);
    }
  };

  var makeOutputAppender = function (outfile, cb) {
    return function (err, data) {
      appendToOutput(err, outfile, data, cb);
    };
  };

  var inputs = args.files;
  var outfile = args.outfile;
  var appender = makeOutputAppender(outfile, handleError);

  if (inputs.length === 0) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    var compilerInput = '';
    process.stdin.on('data', function (data) {
      compilerInput += data;
    });

    process.stdin.on('end', function () {
      compileOne(null, compilerInput, appender);
    });

    process.stdin.on('error', handleError);
  } else {
    inputs.forEach(function (f) {
      fs.readFile(f, 'utf8', function (err, data) {
        compileOne(err, data, appender);
      });
    });
  }
};
