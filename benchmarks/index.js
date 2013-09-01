
var Benchmark = require('benchmark');

var benchmarker = function (mod) {
  var result = require('./' + mod),
      suite = new Benchmark.Suite();

  result.run.call(suite, suite);

  suite.on('cycle', function (event) {
    console.log(String(event.target));
  }).on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'), '\n');
  }).run(result);
};

console.log('Running benchmarks...\n');

var tests = process.argv.slice(2);
if (!tests.length) {
  tests = [
    'datum',
    'expander',
    'reader'
  ];
}

tests.forEach(benchmarker);
