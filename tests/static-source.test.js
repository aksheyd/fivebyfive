"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

var html = read("index.html");
var css = read("css/game.css");
var ui = read("js/ui.js");
var readme = read("README.md");

var failed = 0;
var passed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log("ok  " + msg);
  } else {
    failed += 1;
    console.error("FAIL  " + msg);
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function localRefs(source, pattern) {
  var refs = [];
  var match;
  while ((match = pattern.exec(source))) {
    if (!/^(https?:|data:|mailto:|#)/.test(match[1]) && refs.indexOf(match[1]) === -1) {
      refs.push(match[1]);
    }
  }
  return refs;
}

console.log("# static source");

assert(/<script\s+src="js\/game\.js">/.test(html), "index.html loads js/game.js as a classic script");
assert(/<script\s+src="js\/ui\.js">/.test(html), "index.html loads js/ui.js as a classic script");
assert(html.indexOf('type="module"') === -1, "index.html has no module scripts, so it opens from file://");

localRefs(html, /(?:src|href)="([^"]+)"/g).forEach(function (ref) {
  assert(exists(ref), "index.html reference exists: " + ref);
});

localRefs(css, /url\("?([^")]+)"?\)/g).forEach(function (ref) {
  assert(exists(path.join("css", ref)), "css/game.css asset exists: " + ref);
});

localRefs(readme, /(?:src="|\]\()([^")]+)[")]/g).forEach(function (ref) {
  assert(exists(ref), "README link exists: " + ref);
});

var ids = localRefs(ui, /getElementById\("([^"]+)"\)/g);
assert(ids.length > 0, "js/ui.js looks up elements by id");
ids.forEach(function (id) {
  assert(html.indexOf('id="' + id + '"') !== -1, "index.html has #" + id + " for js/ui.js");
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) {
  process.exit(1);
}
