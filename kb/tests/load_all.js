// load the sharded KB (manifest + every domain shard) as a flat entry list — for node tests/tools
var fs = require('fs'), path = require('path'), K = require('../eiti_kb.js');
module.exports = function () {
  var dir = path.join(__dirname, '..'), idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')), entries = [];
  idx.order.forEach(function (d) {
    entries = entries.concat(K.shardRows(JSON.parse(fs.readFileSync(path.join(dir, idx.domains[d].shard), 'utf8'))));
  });
  return { manifest: idx, entries: entries, index: { domains: idx.domains, entries: entries } };
};
