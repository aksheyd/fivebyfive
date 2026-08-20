"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var GAME_JS = path.join(ROOT, "js", "game.js");

function loadGame() {
  var window = {};
  var sandbox = { window: window, console: console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(GAME_JS, "utf8"), sandbox, {
    filename: "js/game.js"
  });
  if (!window.FiveByFive) {
    throw new Error("js/game.js did not install window.FiveByFive");
  }
  return window.FiveByFive;
}

var G = loadGame();

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

function assertEq(actual, expected, msg) {
  if (actual === expected) {
    passed += 1;
    console.log("ok  " + msg);
  } else {
    failed += 1;
    console.error("FAIL  " + msg + " (got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected) + ")");
  }
}

function card(suit, rank) {
  return { suit: suit, rank: rank };
}

function occupiedCount(grid) {
  var n = 0;
  var r, c;
  for (r = 0; r < 5; r++) {
    for (c = 0; c < 5; c++) {
      if (G.isOccupied(grid[r][c])) {
        n += 1;
      }
    }
  }
  return n;
}

function legalKeySet(grid) {
  return G.legalCells(grid)
    .map(function (p) {
      return p.row + "," + p.col;
    })
    .sort()
    .join("|");
}

console.log("# FiveByFive game logic");

/* --- initial deal --- */
(function () {
  var game = G.createGame({ rng: function () { return 0.5; } });
  var r, c;
  for (c = 0; c < 5; c++) {
    assert(G.isOccupied(game.grid[2][c]), "middle row col " + c + " is dealt");
  }
  for (r = 0; r < 5; r++) {
    if (r === 2) {
      continue;
    }
    for (c = 0; c < 5; c++) {
      assert(!G.isOccupied(game.grid[r][c]), "row " + r + " col " + c + " starts empty");
    }
  }
  assertEq(game.deck.length, 47, "dealing five cards leaves 47 in the deck");
  assertEq(occupiedCount(game.grid), 5, "exactly five cards on the opening table");
})();

/* --- legal vs illegal cells after the middle-row deal --- */
(function () {
  var game = G.createGame({
    grid: (function () {
      var g = G.emptyGrid();
      var c;
      for (c = 0; c < 5; c++) {
        g[2][c] = card("hearts", c + 1);
      }
      return g;
    })(),
    deck: []
  });
  var r, c;
  for (c = 0; c < 5; c++) {
    assert(G.isLegalCell(game.grid, 1, c), "row 1 col " + c + " is legal (touches middle)");
    assert(G.isLegalCell(game.grid, 3, c), "row 3 col " + c + " is legal (touches middle)");
    assert(!G.isLegalCell(game.grid, 0, c), "row 0 col " + c + " is illegal (gap)");
    assert(!G.isLegalCell(game.grid, 4, c), "row 4 col " + c + " is illegal (gap)");
    assert(!G.isLegalCell(game.grid, 2, c), "occupied middle col " + c + " is illegal");
  }
  assertEq(G.legalCells(game.grid).length, 10, "ten legal seats after the opening deal");
  assertEq(legalKeySet(game.grid), "1,0|1,1|1,2|1,3|1,4|3,0|3,1|3,2|3,3|3,4", "legal set is the rows beside the middle");
})();

/* --- guess option mapping --- */
assert(
  G.guessOptions(1).join(",") === "higher,lower",
  "one neighbor offers higher/lower"
);
assert(
  G.guessOptions(2).join(",") === "inside,outside",
  "two neighbors offer inside/outside"
);
assert(
  G.guessOptions(3).join(",") === "same,different",
  "three neighbors offer same/different"
);
assert(
  G.guessOptions(4).join(",") === "same,different",
  "four neighbors offer same/different (surrounded cell stays playable)"
);
assertEq(G.guessOptions(0).length, 0, "zero neighbors offer no guess");

/* --- higher / lower evaluate --- */
assert(
  G.evaluateGuess("higher", card("clubs", 9), [card("hearts", 5)]) === true,
  "evaluate higher: 9 vs 5 is a hit"
);
assert(
  G.evaluateGuess("higher", card("clubs", 4), [card("hearts", 5)]) === false,
  "evaluate higher: 4 vs 5 is a miss"
);
assert(
  G.evaluateGuess("higher", card("clubs", 5), [card("hearts", 5)]) === true,
  "evaluate higher: equal rank is a hit (>=)"
);
assert(
  G.evaluateGuess("lower", card("clubs", 2), [card("hearts", 5)]) === true,
  "evaluate lower: 2 vs 5 is a hit"
);
assert(
  G.evaluateGuess("lower", card("clubs", 10), [card("hearts", 5)]) === false,
  "evaluate lower: 10 vs 5 is a miss"
);
assert(
  G.evaluateGuess("lower", card("clubs", 5), [card("hearts", 5)]) === true,
  "evaluate lower: equal rank is a hit (<=)"
);

/* --- inside / outside evaluate --- */
assert(
  G.evaluateGuess("inside", card("spades", 6), [card("hearts", 3), card("clubs", 9)]) === true,
  "evaluate inside: 6 is between 3 and 9"
);
assert(
  G.evaluateGuess("inside", card("spades", 2), [card("hearts", 3), card("clubs", 9)]) === false,
  "evaluate inside: 2 is not between 3 and 9"
);
assert(
  G.evaluateGuess("outside", card("spades", 2), [card("hearts", 3), card("clubs", 9)]) === true,
  "evaluate outside: 2 is outside 3..9"
);
assert(
  G.evaluateGuess("outside", card("spades", 6), [card("hearts", 3), card("clubs", 9)]) === false,
  "evaluate outside: 6 is not outside 3..9"
);

/* --- same / different evaluate --- */
assert(
  G.evaluateGuess("same", card("hearts", 1), [card("hearts", 12), card("spades", 3), card("clubs", 7)]) === true,
  "evaluate same: hearts matches a neighbor"
);
assert(
  G.evaluateGuess("same", card("diamonds", 1), [card("hearts", 12), card("spades", 3), card("clubs", 7)]) === false,
  "evaluate same: diamonds matches none"
);
assert(
  G.evaluateGuess("different", card("diamonds", 1), [card("hearts", 12), card("spades", 3), card("clubs", 7)]) === true,
  "evaluate different: diamonds is new"
);
assert(
  G.evaluateGuess("different", card("hearts", 1), [card("hearts", 12), card("spades", 3), card("clubs", 7)]) === false,
  "evaluate different: hearts is already present"
);

/* --- applyPlay: higher hit places the drawn card --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][2] = card("hearts", 5);
  var state = { grid: grid, deck: [card("spades", 1)] };
  var result = G.applyPlay(state, 1, 2, "higher", card("clubs", 9));
  assert(result.ok && result.hit, "higher hit: applyPlay reports a hit");
  assert(G.isOccupied(result.state.grid[1][2]), "higher hit: chosen cell is occupied");
  assertEq(result.state.grid[1][2].rank, 9, "higher hit: placed rank is the drawn 9");
  assertEq(result.state.grid[1][2].suit, "clubs", "higher hit: placed suit is clubs");
  assertEq(result.state.grid[2][2].rank, 5, "higher hit: neighbor is unchanged");
  assertEq(result.state.deck.length, 1, "higher hit: leftover deck is untouched");
  assert(!result.won, "higher hit: board is not full");
})();

/* --- applyPlay: higher miss clears row+column and refills middle --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][0] = card("hearts", 2);
  grid[2][1] = card("spades", 3);
  grid[2][2] = card("diamonds", 10);
  grid[2][3] = card("clubs", 5);
  grid[2][4] = card("hearts", 6);
  grid[4][2] = card("clubs", 13);
  var refill = card("spades", 1);
  var state = { grid: grid, deck: [refill] };
  var result = G.applyPlay(state, 1, 2, "higher", card("hearts", 4));
  assert(result.ok && result.hit === false, "higher miss: applyPlay reports a miss");
  assert(!G.isOccupied(result.state.grid[1][2]), "higher miss: chosen cell stays empty");
  assert(!G.isOccupied(result.state.grid[4][2]), "higher miss: rest of column 2 is cleared");
  assert(G.isOccupied(result.state.grid[2][2]), "higher miss: middle of the cleared column is refilled");
  assertEq(result.state.grid[2][0].rank, 2, "higher miss: middle cells outside the column stay");
  assertEq(result.state.grid[2][1].rank, 3, "higher miss: middle col 1 stays");
  assertEq(result.state.grid[2][3].rank, 5, "higher miss: middle col 3 stays");
  assertEq(result.state.grid[2][4].rank, 6, "higher miss: middle col 4 stays");
  assert(
    result.state.deck.length === 2,
    "higher miss: two cleared cards return, one is popped to refill (deck net +1 from the extra column card)"
  );
  assertEq(result.state.deck.length, 2, "higher miss: deck net +1 after two returns and one refill");
})();

/* --- applyPlay: lower hit and miss --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][2] = card("hearts", 8);
  var hit = G.applyPlay({ grid: grid, deck: [] }, 3, 2, "lower", card("spades", 2));
  assert(hit.ok && hit.hit, "lower hit: 2 vs 8 places");
  assertEq(hit.state.grid[3][2].rank, 2, "lower hit: drawn 2 sits at 3,2");

  var missGrid = G.emptyGrid();
  missGrid[2][2] = card("hearts", 8);
  missGrid[2][1] = card("clubs", 4);
  var miss = G.applyPlay(
    { grid: missGrid, deck: [card("diamonds", 1)] },
    3,
    2,
    "lower",
    card("spades", 12)
  );
  assert(miss.ok && miss.hit === false, "lower miss: 12 vs 8 clears");
  assert(!G.isOccupied(miss.state.grid[3][2]), "lower miss: chosen cell empty");
  assert(G.isOccupied(miss.state.grid[2][2]), "lower miss: middle refilled");
  assert(G.isOccupied(miss.state.grid[2][1]), "lower miss: untouched middle neighbor remains");
})();

/* --- applyPlay: inside hit / miss --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][2] = card("hearts", 3);
  grid[1][1] = card("clubs", 9);
  var hit = G.applyPlay({ grid: grid, deck: [] }, 1, 2, "inside", card("spades", 6));
  assert(hit.ok && hit.hit, "inside hit: 6 between 3 and 9 places");
  assertEq(hit.state.grid[1][2].rank, 6, "inside hit: 6 occupies 1,2");

  var missGrid = G.emptyGrid();
  missGrid[2][2] = card("hearts", 3);
  missGrid[1][1] = card("clubs", 9);
  missGrid[2][0] = card("diamonds", 12);
  var miss = G.applyPlay(
    { grid: missGrid, deck: [card("hearts", 1)] },
    1,
    2,
    "inside",
    card("spades", 13)
  );
  assert(miss.ok && miss.hit === false, "inside miss: 13 not between 3 and 9");
  assert(!G.isOccupied(miss.state.grid[1][2]), "inside miss: chosen cell empty");
  assert(!G.isOccupied(miss.state.grid[1][1]), "inside miss: the rest of row 1 is cleared");
  assert(G.isOccupied(miss.state.grid[2][0]), "inside miss: middle col 0 was not in the cleared column");
  assert(G.isOccupied(miss.state.grid[2][2]), "inside miss: middle of column 2 refilled");
})();

/* --- applyPlay: outside hit / miss --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][2] = card("hearts", 4);
  grid[1][3] = card("clubs", 8);
  var hit = G.applyPlay({ grid: grid, deck: [] }, 1, 2, "outside", card("spades", 2));
  assert(hit.ok && hit.hit, "outside hit: 2 outside 4..8 places");
  assertEq(hit.state.grid[1][2].suit, "spades", "outside hit: drawn card sits");

  var missGrid = G.emptyGrid();
  missGrid[2][2] = card("hearts", 4);
  missGrid[1][3] = card("clubs", 8);
  var miss = G.applyPlay(
    { grid: missGrid, deck: [card("diamonds", 1)] },
    1,
    2,
    "outside",
    card("spades", 6)
  );
  assert(miss.ok && miss.hit === false, "outside miss: 6 is inside 4..8");
  assert(!G.isOccupied(miss.state.grid[1][2]), "outside miss: chosen cell empty");
  assert(!G.isOccupied(miss.state.grid[1][3]), "outside miss: row 1 cleared");
})();

/* --- applyPlay: same / different with three neighbors --- */
(function () {
  var grid = G.emptyGrid();
  grid[0][1] = card("hearts", 12);
  grid[2][1] = card("spades", 3);
  grid[1][2] = card("clubs", 7);
  var hit = G.applyPlay({ grid: grid, deck: [] }, 1, 1, "same", card("hearts", 1));
  assert(hit.ok && hit.hit, "same hit: hearts matches a neighbor");
  assertEq(hit.state.grid[1][1].suit, "hearts", "same hit: hearts occupies the hole");

  var missGrid = G.emptyGrid();
  missGrid[0][1] = card("hearts", 12);
  missGrid[2][1] = card("spades", 3);
  missGrid[1][2] = card("clubs", 7);
  missGrid[2][4] = card("diamonds", 9);
  var miss = G.applyPlay(
    { grid: missGrid, deck: [card("diamonds", 2)] },
    1,
    1,
    "same",
    card("diamonds", 1)
  );
  assert(miss.ok && miss.hit === false, "same miss: diamonds is not in H/S/C");
  assert(!G.isOccupied(miss.state.grid[1][1]), "same miss: hole stays empty");
  assert(!G.isOccupied(miss.state.grid[0][1]), "same miss: column 1 cleared");
  assert(!G.isOccupied(miss.state.grid[1][2]), "same miss: row 1 cleared");
  assert(G.isOccupied(miss.state.grid[2][4]), "same miss: far middle card remains");
  assert(G.isOccupied(miss.state.grid[2][1]), "same miss: middle of cleared column refilled");
})();

(function () {
  var grid = G.emptyGrid();
  grid[0][1] = card("hearts", 12);
  grid[2][1] = card("spades", 3);
  grid[1][2] = card("clubs", 7);
  var hit = G.applyPlay({ grid: grid, deck: [] }, 1, 1, "different", card("diamonds", 4));
  assert(hit.ok && hit.hit, "different hit: diamonds is new among H/S/C");
  assertEq(hit.state.grid[1][1].suit, "diamonds", "different hit: places diamonds");

  var miss = G.applyPlay(
    {
      grid: (function () {
        var g = G.emptyGrid();
        g[0][1] = card("hearts", 12);
        g[2][1] = card("spades", 3);
        g[1][2] = card("clubs", 7);
        return g;
      })(),
      deck: [card("clubs", 1)]
    },
    1,
    1,
    "different",
    card("hearts", 4)
  );
  assert(miss.ok && miss.hit === false, "different miss: hearts already neighbors");
})();

/* --- four occupied neighbors: same/different still plays --- */
(function () {
  var grid = G.emptyGrid();
  grid[0][1] = card("hearts", 2);
  grid[2][1] = card("spades", 4);
  grid[1][0] = card("diamonds", 6);
  grid[1][2] = card("clubs", 8);
  assertEq(G.occupiedNeighbors(grid, 1, 1).length, 4, "hole at 1,1 has four occupied neighbors");
  assert(G.isLegalCell(grid, 1, 1), "surrounded empty cell is legal");
  assert(
    G.guessOptions(G.occupiedNeighbors(grid, 1, 1).length).join(",") === "same,different",
    "four neighbors map to same/different"
  );
  var hit = G.applyPlay({ grid: grid, deck: [] }, 1, 1, "same", card("clubs", 13));
  assert(hit.ok && hit.hit, "four-neighbor same hit places");
  assertEq(hit.state.grid[1][1].rank, 13, "four-neighbor play occupies the hole");

  var missGrid = G.emptyGrid();
  missGrid[0][1] = card("hearts", 2);
  missGrid[2][1] = card("spades", 4);
  missGrid[1][0] = card("diamonds", 6);
  missGrid[1][2] = card("clubs", 8);
  var miss = G.applyPlay(
    { grid: missGrid, deck: [card("hearts", 1), card("hearts", 3)] },
    1,
    1,
    "different",
    card("hearts", 9)
  );
  assert(miss.ok && miss.hit === false, "four-neighbor different miss (hearts already present) clears");
  assert(!G.isOccupied(miss.state.grid[1][1]), "four-neighbor miss leaves the hole empty");
})();

/* --- illegal applyPlay does not place --- */
(function () {
  var grid = G.emptyGrid();
  grid[2][2] = card("hearts", 5);
  var result = G.applyPlay({ grid: grid, deck: [] }, 0, 0, "higher", card("clubs", 9));
  assert(result.ok === false, "applyPlay rejects a cell with no occupied neighbor");
  assert(!G.isOccupied(result.state.grid[0][0]), "rejected play does not occupy the cell");
})();

/* --- board-full is a win --- */
(function () {
  var grid = G.emptyGrid();
  var r, c;
  for (r = 0; r < 5; r++) {
    for (c = 0; c < 5; c++) {
      grid[r][c] = card(G.SUITS[(r + c) % 4], ((r * 5 + c) % 13) + 1);
    }
  }
  assert(G.isBoardFull(grid), "a fully occupied 5×5 is a win");
  grid[1][2] = null;
  assert(!G.isBoardFull(grid), "one hole means the board is not full");
  assert(G.isLegalCell(grid, 1, 2), "the last hole is legal");
  var result = G.applyPlay(
    { grid: grid, deck: [] },
    1,
    2,
    "same",
    card(grid[1][1].suit, 13)
  );
  assert(result.ok && result.hit, "filling the last hole hits");
  assert(result.won, "filling the last hole wins");
  assert(G.isBoardFull(result.state.grid), "winning grid is fully occupied");
})();

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) {
  process.exit(1);
}
