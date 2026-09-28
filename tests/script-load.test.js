"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var SCRIPTS = [
  { file: "js/game.js", globalName: "FiveByFive" },
  { file: "js/ui.js", globalName: "FiveByFiveUI" }
];

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

function loadScript(relPath) {
  var window = {};
  var sandbox = { window: window, console: console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, relPath), "utf8"), sandbox, {
    filename: relPath
  });
  return sandbox.window;
}

console.log("# script load (window, no Node globals)");

SCRIPTS.forEach(function (entry) {
  var source = fs.readFileSync(path.join(ROOT, entry.file), "utf8");
  assert(source.indexOf("module.exports") === -1, entry.file + " has no module.exports");
  assert(!/^\s*export\s/m.test(source), entry.file + " is not an ES-module-only entry");
  var thrown = null;
  var win;
  try {
    win = loadScript(entry.file);
  } catch (err) {
    thrown = err;
  }
  assert(thrown === null, entry.file + " executes without throw" + (thrown ? " (" + thrown.message + ")" : ""));
  if (win) {
    assert(typeof win[entry.globalName] === "object", entry.file + " installs window." + entry.globalName);
  }
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) {
  process.exit(1);
}
