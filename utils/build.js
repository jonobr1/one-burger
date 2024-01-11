const fs = require('fs');
const path = require('path');
const es = require('esbuild');
const entryPoints = [
  path.resolve(__dirname, '../src/index.js')
];

es.buildSync({
  entryPoints,
  bundle: true,
  loader: { '.js': 'jsx' },
  outfile: path.resolve(__dirname, '../public/index.js')
});