"use strict";

var fs = require("fs");
var http = require("http");
var path = require("path");
var url = require("url");

var ROOT = path.join(__dirname, "..");
var SCRATCH = process.env.FIVEBYFIVE_SCRATCH;
if (!SCRATCH) {
  console.error("FIVEBYFIVE_SCRATCH is required");
  process.exit(1);
}

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

function writeLog(name, text) {
  fs.writeFileSync(path.join(SCRATCH, name), text);
}

function startServer() {
  return new Promise(function (resolve, reject) {
    var server = http.createServer(function (req, res) {
      var pathname = url.parse(req.url).pathname;
      if (pathname === "/") {
        pathname = "/index.html";
      }
      var filePath = path.normalize(path.join(ROOT, pathname));
      if (filePath.indexOf(ROOT) !== 0) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, function (err, data) {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream"
        });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", function () {
      resolve(server);
    });
    server.on("error", reject);
  });
}

function loadPlaywright() {
  try {
    return Promise.resolve(require("playwright"));
  } catch (err) {
    return Promise.reject(err);
  }
}

async function run() {
  var playwright;
  try {
    playwright = await loadPlaywright();
  } catch (err) {
    writeLog(
      "playwright-unavailable.log",
      "Playwright require() failed:\n" + String(err && err.stack ? err.stack : err) + "\n"
    );
    console.log("playwright unavailable; wrote playwright-unavailable.log");
    return;
  }

  var server = await startServer();
  var port = server.address().port;
  var origin = "http://127.0.0.1:" + port + "/";
  var log = [];
  var browser;

  function note(line) {
    log.push(line);
    console.log(line);
  }

  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (err) {
    server.close();
    writeLog(
      "playwright-unavailable.log",
      "Chromium failed to launch:\n" + String(err && err.stack ? err.stack : err) + "\n"
    );
    console.log("chromium unavailable; wrote playwright-unavailable.log");
    return;
  }

  try {
    var i;
    var page;
    var errors;
    var boardBox;
    var trayHidden;
    var legal;
    for (i = 1; i <= 2; i++) {
      errors = [];
      page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      page.on("pageerror", function (e) {
        errors.push(String(e));
      });
      await page.goto(origin, { waitUntil: "load", timeout: 30000 });
      await page.waitForSelector('[data-legal="true"]', { timeout: 10000 });
      await page.waitForTimeout(700);
      boardBox = await page.locator("#board").boundingBox();
      if (!boardBox || boardBox.width < 200 || boardBox.height < 200) {
        throw new Error("board render surface too small: " + JSON.stringify(boardBox));
      }
      note("load " + i + " board " + Math.round(boardBox.width) + "x" + Math.round(boardBox.height));
      if (errors.length) {
        throw new Error("page errors on load " + i + ": " + errors.join(" | "));
      }
      if (i === 1) {
        await page.setViewportSize({ width: 1920, height: 1080 });
        var overflow = await page.evaluate(function () {
          var root = document.documentElement;
          return {
            innerHeight: window.innerHeight,
            innerWidth: window.innerWidth,
            scrollHeight: root.scrollHeight,
            scrollWidth: root.scrollWidth
          };
        });
        note("1080p overflow " + JSON.stringify(overflow));
        if (overflow.scrollHeight > overflow.innerHeight + 2) {
          throw new Error("page taller than 1920x1080 viewport: " + JSON.stringify(overflow));
        }
        if (overflow.scrollWidth > overflow.innerWidth + 2) {
          throw new Error("page wider than 1920x1080 viewport: " + JSON.stringify(overflow));
        }
        await page.screenshot({ path: path.join(SCRATCH, "page-1.png"), fullPage: true });
        note("wrote page-1.png");
        await page.setViewportSize({ width: 390, height: 844 });
        var mobileBoard = await page.locator("#board").boundingBox();
        if (!mobileBoard || mobileBoard.width < 160 || mobileBoard.height < 160) {
          throw new Error("mobile board too small: " + JSON.stringify(mobileBoard));
        }
        note("mobile board " + Math.round(mobileBoard.width) + "x" + Math.round(mobileBoard.height));
        await page.screenshot({ path: path.join(SCRATCH, "page-mobile.png"), fullPage: true });
        note("wrote page-mobile.png");
      }
      if (i === 2) {
        trayHidden = await page.locator("#guess-tray").isHidden();
        if (!trayHidden) {
          throw new Error("guess tray should start hidden");
        }
        legal = page.locator('[data-legal="true"]').first();
        await legal.click();
        await page.waitForSelector("#guess-tray:not([hidden])", { timeout: 5000 });
        await page.waitForTimeout(350);
        var prompt = await page.locator("#guess-prompt").innerText();
        var guessA = await page.locator("#guess-a").innerText();
        var guessB = await page.locator("#guess-b").innerText();
        if (!prompt || !guessA || !guessB) {
          throw new Error("guess choices did not appear");
        }
        note("after click prompt=" + JSON.stringify(prompt));
        note("choices=" + JSON.stringify([guessA, guessB]));
        var trayOverflow = await page.evaluate(function () {
          var root = document.documentElement;
          return {
            innerHeight: window.innerHeight,
            scrollHeight: root.scrollHeight,
            scrollWidth: root.scrollWidth,
            innerWidth: window.innerWidth
          };
        });
        note("1080p with tray " + JSON.stringify(trayOverflow));
        if (trayOverflow.scrollHeight > trayOverflow.innerHeight + 2) {
          throw new Error("guess tray overflowed 1920x1080: " + JSON.stringify(trayOverflow));
        }
        await page.screenshot({ path: path.join(SCRATCH, "page-2.png"), fullPage: true });
        note("wrote page-2.png");
        await page.locator("#guess-a").click();
        await page.waitForFunction(function () {
          var result = document.getElementById("result");
          var drawn = document.getElementById("drawn-card");
          return (
            result &&
            result.textContent &&
            result.textContent.trim().length > 0 &&
            drawn &&
            !drawn.classList.contains("is-empty")
          );
        });
        var resultText = (await page.locator("#result").innerText()).trim();
        var deckAfter = (await page.locator("#deck-count").innerText()).trim();
        note("after guess result=" + JSON.stringify(resultText));
        note("deck after guess=" + deckAfter);
        if (resultText.indexOf("It stays") !== 0 && resultText.indexOf("Miss.") !== 0) {
          throw new Error("result did not describe place or clear: " + resultText);
        }
      }
      await page.close();
    }
    writeLog("playwright.log", log.join("\n") + "\n");
    note("playwright smoke passed");
  } catch (err) {
    writeLog("playwright.log", log.join("\n") + "\nERROR: " + String(err && err.stack ? err.stack : err) + "\n");
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
