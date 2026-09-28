(function (root) {
  "use strict";

  var SIZE = 5;
  var MIDDLE = 2;
  var SUITS = ["hearts", "spades", "diamonds", "clubs"];
  var RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  var DIRS = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1]
  ];

  function isOccupied(card) {
    return !!(card && card.suit && card.rank);
  }

  function cloneCard(card) {
    if (!isOccupied(card)) {
      return null;
    }
    return { suit: card.suit, rank: card.rank };
  }

  function emptyGrid() {
    var grid = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      grid[r] = [];
      for (c = 0; c < SIZE; c++) {
        grid[r][c] = null;
      }
    }
    return grid;
  }

  function cloneGrid(grid) {
    var copy = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      copy[r] = [];
      for (c = 0; c < SIZE; c++) {
        copy[r][c] = cloneCard(grid[r][c]);
      }
    }
    return copy;
  }

  function cloneState(state) {
    return {
      grid: cloneGrid(state.grid),
      deck: (state.deck || []).map(cloneCard)
    };
  }

  function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function freshDeck() {
    var cards = [];
    var i, j;
    for (i = 0; i < RANKS.length; i++) {
      for (j = 0; j < SUITS.length; j++) {
        cards.push({ suit: SUITS[j], rank: RANKS[i] });
      }
    }
    return cards;
  }

  function shuffle(cards, rng) {
    var a = cards.map(cloneCard);
    var i, j, tmp;
    rng = rng || Math.random;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rng() * (i + 1));
      tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function drawCard(deck) {
    if (!deck || !deck.length) {
      return null;
    }
    return deck.pop();
  }

  function fillMiddleRow(grid, deck) {
    var i;
    for (i = 0; i < SIZE; i++) {
      if (!isOccupied(grid[MIDDLE][i]) && deck && deck.length) {
        grid[MIDDLE][i] = cloneCard(drawCard(deck));
      }
    }
    return grid;
  }

  function createGame(options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var deck = options.deck
      ? options.deck.map(cloneCard)
      : shuffle(freshDeck(), rng);
    var grid = options.grid ? cloneGrid(options.grid) : emptyGrid();
    if (!options.grid) {
      fillMiddleRow(grid, deck);
    }
    return { grid: grid, deck: deck };
  }

  function occupiedNeighbors(grid, row, col) {
    var found = [];
    var i, nr, nc;
    for (i = 0; i < DIRS.length; i++) {
      nr = row + DIRS[i][0];
      nc = col + DIRS[i][1];
      if (inBounds(nr, nc) && isOccupied(grid[nr][nc])) {
        found.push({ row: nr, col: nc, card: cloneCard(grid[nr][nc]) });
      }
    }
    return found;
  }

  function neighborCards(grid, row, col) {
    return occupiedNeighbors(grid, row, col).map(function (n) {
      return n.card;
    });
  }

  function isLegalCell(grid, row, col) {
    if (!inBounds(row, col) || isOccupied(grid[row][col])) {
      return false;
    }
    return occupiedNeighbors(grid, row, col).length > 0;
  }

  function legalCells(grid) {
    var cells = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (isLegalCell(grid, r, c)) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }

  function guessOptions(neighborCount) {
    if (neighborCount === 1) {
      return ["higher", "lower"];
    }
    if (neighborCount === 2) {
      return ["inside", "outside"];
    }
    if (neighborCount === 3 || neighborCount === 4) {
      return ["same", "different"];
    }
    return [];
  }

  function minRank(cards) {
    var m = cards[0].rank;
    var i;
    for (i = 1; i < cards.length; i++) {
      if (cards[i].rank < m) {
        m = cards[i].rank;
      }
    }
    return m;
  }

  function maxRank(cards) {
    var m = cards[0].rank;
    var i;
    for (i = 1; i < cards.length; i++) {
      if (cards[i].rank > m) {
        m = cards[i].rank;
      }
    }
    return m;
  }

  function evaluateGuess(guess, drawn, neighbors) {
    var mn, mx, i, suits;
    if (!drawn || !neighbors || !neighbors.length) {
      return false;
    }
    if (guess === "higher") {
      return drawn.rank >= neighbors[0].rank;
    }
    if (guess === "lower") {
      return drawn.rank <= neighbors[0].rank;
    }
    if (guess === "inside") {
      mn = minRank(neighbors);
      mx = maxRank(neighbors);
      return drawn.rank >= mn && drawn.rank <= mx;
    }
    if (guess === "outside") {
      mn = minRank(neighbors);
      mx = maxRank(neighbors);
      return drawn.rank <= mn || drawn.rank >= mx;
    }
    if (guess === "same") {
      for (i = 0; i < neighbors.length; i++) {
        if (neighbors[i].suit === drawn.suit) {
          return true;
        }
      }
      return false;
    }
    if (guess === "different") {
      suits = {};
      for (i = 0; i < neighbors.length; i++) {
        suits[neighbors[i].suit] = true;
      }
      return !suits[drawn.suit];
    }
    return false;
  }

  function returnClearedToDeck(grid, deck, row, col) {
    var x;
    for (x = 0; x < SIZE; x++) {
      if (isOccupied(grid[x][col])) {
        deck.unshift(cloneCard(grid[x][col]));
        grid[x][col] = null;
      }
      if (isOccupied(grid[row][x])) {
        deck.unshift(cloneCard(grid[row][x]));
        grid[row][x] = null;
      }
    }
  }

  function isBoardFull(grid) {
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (!isOccupied(grid[r][c])) {
          return false;
        }
      }
    }
    return true;
  }

  function applyPlay(state, row, col, guess, drawn) {
    var next = cloneState(state);
    var neighbors;
    var hit;

    if (!isLegalCell(next.grid, row, col)) {
      return {
        ok: false,
        error: "illegal",
        hit: false,
        won: isBoardFull(next.grid),
        state: next,
        drawn: cloneCard(drawn)
      };
    }

    neighbors = neighborCards(next.grid, row, col);
    if (guessOptions(neighbors.length).indexOf(guess) === -1) {
      return {
        ok: false,
        error: "bad-guess",
        hit: false,
        won: isBoardFull(next.grid),
        state: next,
        drawn: cloneCard(drawn)
      };
    }

    hit = evaluateGuess(guess, drawn, neighbors);
    if (hit) {
      next.grid[row][col] = cloneCard(drawn);
    } else {
      returnClearedToDeck(next.grid, next.deck, row, col);
      fillMiddleRow(next.grid, next.deck);
    }

    return {
      ok: true,
      hit: hit,
      won: isBoardFull(next.grid),
      state: next,
      drawn: cloneCard(drawn)
    };
  }

  root.FiveByFive = {
    SIZE: SIZE,
    MIDDLE: MIDDLE,
    SUITS: SUITS,
    RANKS: RANKS,
    isOccupied: isOccupied,
    cloneCard: cloneCard,
    emptyGrid: emptyGrid,
    cloneGrid: cloneGrid,
    cloneState: cloneState,
    freshDeck: freshDeck,
    shuffle: shuffle,
    drawCard: drawCard,
    fillMiddleRow: fillMiddleRow,
    createGame: createGame,
    occupiedNeighbors: occupiedNeighbors,
    neighborCards: neighborCards,
    isLegalCell: isLegalCell,
    legalCells: legalCells,
    guessOptions: guessOptions,
    evaluateGuess: evaluateGuess,
    isBoardFull: isBoardFull,
    applyPlay: applyPlay
  };
})(typeof window !== "undefined" ? window : this);
