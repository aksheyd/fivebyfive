"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
var css = fs.readFileSync(path.join(ROOT, "css", "game.css"), "utf8");
var ui = fs.readFileSync(path.join(ROOT, "js", "ui.js"), "utf8");
var game = fs.readFileSync(path.join(ROOT, "js", "game.js"), "utf8");
var readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

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

console.log("# static source");

assert(/<script\s+src="js\/game\.js">/.test(html), "index.html loads js/game.js with a classic script tag");
assert(/<script\s+src="js\/ui\.js">/.test(html), "index.html loads js/ui.js with a classic script tag");
assert(html.indexOf('type="module"') === -1, "index.html is not an ES-module-only entry");
assert(/id="board"/.test(html), "index.html has a board mount");
assert(/id="guess-tray"/.test(html), "index.html has a two-choice guess tray");
assert(/id="guess-a"/.test(html) && /id="guess-b"/.test(html), "index.html has two guess controls");
assert(/id="drawn-card"/.test(html), "index.html has a drawn-card well");
assert(/id="result"/.test(html), "index.html has a result line for place/clear/win");

assert(/grid-template-columns:\s*repeat\(5/.test(css), "CSS lays out five columns");
assert(/100dvh/.test(css) && /overflow:\s*hidden/.test(css), "desktop layout is locked to one viewport");
assert(/for \(r = 0; r < G\.SIZE; r\+\+\)/.test(ui) && /for \(c = 0; c < G\.SIZE; c\+\+\)/.test(ui), "ui.js renders a 5×5 board");
assert(/G\.applyPlay\(/.test(ui), "UI binds the shipped applyPlay rules");
assert(/els\.guessTray\.hidden = false/.test(ui), "selecting a cell reveals guess choices in the DOM");
assert(/takes the seat/.test(ui), "a hit updates page copy");
assert(/row and column go back/.test(ui), "a miss updates page copy");
assert(/The table is full/.test(ui), "a win updates page copy");

var tokens = css.match(/--[a-z]+:\s*#[0-9A-Fa-f]{6}/g) || [];
assert(tokens.length >= 4 && tokens.length <= 6, "CSS names 4–6 hex tokens (found " + tokens.length + ")");
assert(/--walnut:\s*#4A2E1C/.test(css), "walnut token is present");
assert(/--bone:\s*#F6EFE4/.test(css), "bone token is present");
assert(/--oxblood:\s*#9A2E32/.test(css), "oxblood token is present");
assert(/--soot:\s*#2A211C/.test(css), "soot token is present");
assert(/--straw:\s*#C4A574/.test(css), "straw token is present");
assert(/Bodoni Moda/.test(css) && /Figtree/.test(css), "display + body type pairing is set");
assert(/photographed walnut dining table/.test(css) || /dining table as the full-bleed/.test(css), "signature dining-table surface is documented in CSS");
assert(/assets\/table\.jpg/.test(css), "page uses a real table photograph as the visual anchor");
assert(/prefers-reduced-motion/.test(css), "prefers-reduced-motion is respected");
assert(/:focus-visible/.test(css), ":focus-visible is visible");
assert(/@media \(max-width: 640px\)/.test(css), "narrow/mobile layout exists");

var cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");
assert(!/#F4F1EA/i.test(cssCode), "avoids generic cream as a used color");
assert(!/#39FF14|#00FF00|#CCFF00/i.test(cssCode), "avoids acid-green as a used color");
assert(!/#0A0A0A|#111111|#050505/i.test(cssCode), "avoids a near-black canvas as a used color");

assert(/index\.html/.test(readme), "README tells a person to open the HTML page");
assert(!/print the grid to stdout/i.test(readme), "README does not document a stdout grid dump");
assert(!/python main\.py[\s\S]{0,80}stdout/i.test(readme), "python main.py is not documented as a stdout play path");

assert(/var SIZE = 5/.test(game), "shipped rules use a 5×5");
assert(/guess === "higher"/.test(game) && /guess === "inside"/.test(game) && /guess === "same"/.test(game), "shipped rules include higher/inside/same");

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) {
  process.exit(1);
}
