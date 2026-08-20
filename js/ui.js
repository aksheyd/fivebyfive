(function (root) {
  "use strict";

  var RANK_LABEL = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  var SUIT_GLYPH = {
    hearts: "♥",
    spades: "♠",
    diamonds: "♦",
    clubs: "♣"
  };
  var GUESS_COPY = {
    higher: "Higher",
    lower: "Lower",
    inside: "Inside",
    outside: "Outside",
    same: "Same suit",
    different: "Different suit"
  };

  var G;
  var state;
  var selected = null;
  var els = {};

  function rankLabel(rank) {
    return RANK_LABEL[rank] || String(rank);
  }

  function formatCard(card) {
    return rankLabel(card.rank) + SUIT_GLYPH[card.suit];
  }

  function isCoral(card) {
    return card.suit === "hearts" || card.suit === "diamonds";
  }

  function buildFace(card) {
    var face = document.createElement("span");
    var north = document.createElement("span");
    var mini = document.createElement("span");
    var pip = document.createElement("span");
    face.className = "face" + (isCoral(card) ? " is-coral" : "");
    north.className = "rank";
    mini.className = "mini-suit";
    pip.className = "pip";
    north.textContent = rankLabel(card.rank);
    mini.textContent = SUIT_GLYPH[card.suit];
    pip.textContent = SUIT_GLYPH[card.suit];
    north.appendChild(mini);
    face.appendChild(north);
    face.appendChild(pip);
    return face;
  }

  function setDrawn(card) {
    els.drawn.innerHTML = "";
    if (!card) {
      els.drawn.classList.add("is-empty");
      els.drawn.setAttribute("aria-label", "No draw yet");
      return;
    }
    els.drawn.classList.remove("is-empty");
    els.drawn.setAttribute("aria-label", "Last draw " + formatCard(card));
    els.drawn.appendChild(buildFace(card));
  }

  function hideGuesses() {
    els.guessTray.hidden = true;
    els.guessPrompt.textContent = "";
    els.guessA.removeAttribute("data-guess");
    els.guessB.removeAttribute("data-guess");
    els.guessA.textContent = "";
    els.guessB.textContent = "";
  }

  function showGuesses(row, col) {
    var neighbors = G.occupiedNeighbors(state.grid, row, col);
    var options = G.guessOptions(neighbors.length);
    var names = neighbors.map(function (n) {
      return formatCard(n.card);
    });
    var prompt;
    if (options[0] === "higher") {
      prompt = "Will the next card be higher or lower than " + names[0] + "?";
    } else if (options[0] === "inside") {
      prompt = "Will the next card sit inside or outside " + names.join(" and ") + "?";
    } else {
      prompt = "Same suit as a neighbor, or different? Neighbors: " + names.join(", ") + ".";
    }
    els.guessPrompt.textContent = prompt;
    els.guessA.setAttribute("data-guess", options[0]);
    els.guessB.setAttribute("data-guess", options[1]);
    els.guessA.textContent = GUESS_COPY[options[0]];
    els.guessB.textContent = GUESS_COPY[options[1]];
    els.guessTray.hidden = false;
  }

  function renderBoard() {
    var r;
    var c;
    var seat;
    var legal;
    var card;
    var won = G.isBoardFull(state.grid);
    els.board.innerHTML = "";
    for (r = 0; r < G.SIZE; r++) {
      for (c = 0; c < G.SIZE; c++) {
        card = state.grid[r][c];
        legal = !won && G.isLegalCell(state.grid, r, c);
        seat = document.createElement("button");
        seat.type = "button";
        seat.className = "seat";
        seat.setAttribute("role", "gridcell");
        seat.setAttribute("data-row", String(r));
        seat.setAttribute("data-col", String(c));
        seat.setAttribute("data-legal", legal ? "true" : "false");
        seat.setAttribute("data-occupied", G.isOccupied(card) ? "true" : "false");
        seat.setAttribute(
          "aria-label",
          G.isOccupied(card)
            ? formatCard(card) + " at row " + r + " column " + c
            : (legal ? "Empty legal seat, row " + r + " column " + c : "Empty seat, row " + r + " column " + c)
        );
        if (selected && selected.row === r && selected.col === c) {
          seat.classList.add("is-selected");
        }
        if (G.isOccupied(card)) {
          seat.appendChild(buildFace(card));
          seat.disabled = true;
        } else if (!legal) {
          seat.disabled = true;
        }
        seat.style.animationDelay = (r * 5 + c) * 18 + "ms";
        seat.addEventListener("click", onSeatClick);
        els.board.appendChild(seat);
      }
    }
    els.deckCount.textContent = String(state.deck.length);
    if (won) {
      document.body.classList.add("is-won");
      els.status.textContent = "The table is full. You win.";
      els.result.textContent = "The table is full. You win.";
      hideGuesses();
      selected = null;
    }
  }

  function onSeatClick(event) {
    var seat = event.currentTarget;
    var row = Number(seat.getAttribute("data-row"));
    var col = Number(seat.getAttribute("data-col"));
    if (seat.getAttribute("data-legal") !== "true") {
      return;
    }
    selected = { row: row, col: col };
    els.result.textContent = "";
    renderBoard();
    showGuesses(row, col);
    els.guessA.focus();
  }

  function onGuess(event) {
    var guess = event.currentTarget.getAttribute("data-guess");
    var drawn;
    var result;
    if (!selected || !guess) {
      return;
    }
    drawn = G.drawCard(state.deck);
    if (!drawn) {
      els.result.textContent = "The deck is empty. Deal again.";
      return;
    }
    result = G.applyPlay(state, selected.row, selected.col, guess, drawn);
    state = result.state;
    selected = null;
    setDrawn(result.drawn);
    hideGuesses();
    if (result.hit) {
      els.result.textContent = "It stays. " + formatCard(result.drawn) + " takes the seat.";
      els.status.textContent = result.won
        ? "The table is full. You win."
        : "Choose a seat beside a card.";
    } else {
      els.result.textContent = "Miss. That row and column go back to the deck.";
      els.status.textContent = "Choose a seat beside a card.";
    }
    renderBoard();
  }

  function onBoardKey(event) {
    var map = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    };
    var delta = map[event.key];
    var active;
    var row;
    var col;
    var next;
    if (!delta) {
      return;
    }
    active = document.activeElement;
    if (!active || !els.board.contains(active) || !active.getAttribute("data-row")) {
      return;
    }
    event.preventDefault();
    row = Number(active.getAttribute("data-row")) + delta[0];
    col = Number(active.getAttribute("data-col")) + delta[1];
    if (row < 0 || row > 4 || col < 0 || col > 4) {
      return;
    }
    next = els.board.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
    if (next) {
      next.focus();
    }
  }

  function newDeal() {
    document.body.classList.remove("is-won");
    state = G.createGame();
    selected = null;
    els.result.textContent = "";
    els.status.textContent = "Choose a seat beside a card.";
    setDrawn(null);
    hideGuesses();
    renderBoard();
    els.board.classList.add("is-fresh");
    window.setTimeout(function () {
      if (els.board) {
        els.board.classList.remove("is-fresh");
      }
    }, 900);
  }

  function boot() {
    G = root.FiveByFive;
    if (!G || !root.document) {
      return;
    }
    els.board = root.document.getElementById("board");
    els.status = root.document.getElementById("status");
    els.deckCount = root.document.getElementById("deck-count");
    els.drawn = root.document.getElementById("drawn-card");
    els.guessTray = root.document.getElementById("guess-tray");
    els.guessPrompt = root.document.getElementById("guess-prompt");
    els.guessA = root.document.getElementById("guess-a");
    els.guessB = root.document.getElementById("guess-b");
    els.result = root.document.getElementById("result");
    els.deal = root.document.getElementById("deal-again");
    if (!els.board || !els.guessA || !els.guessB || !els.deal) {
      return;
    }
    els.guessA.addEventListener("click", onGuess);
    els.guessB.addEventListener("click", onGuess);
    els.deal.addEventListener("click", newDeal);
    els.board.addEventListener("keydown", onBoardKey);
    newDeal();
  }

  root.FiveByFiveUI = {
    boot: boot,
    newDeal: newDeal
  };

  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : this);
