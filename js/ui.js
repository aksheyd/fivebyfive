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
  var MOVE = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    w: [-1, 0],
    a: [0, -1],
    s: [1, 0],
    d: [0, 1]
  };

  var STORE = "five-by-five";
  var G;
  var state;
  var seats;
  var selected = null;
  var lastDrawn = null;
  var neighborSet = null;
  var held = null;
  var cursor = { row: 1, col: 0 };
  var epoch = 0;
  var clearTimer = 0;
  var hideTimer = 0;
  var hideGen = 0;
  var els = {};

  function rankLabel(rank) {
    return RANK_LABEL[rank] || String(rank);
  }

  function formatCard(card) {
    return rankLabel(card.rank) + SUIT_GLYPH[card.suit];
  }

  function cardKey(card) {
    if (!G.isOccupied(card)) {
      return "";
    }
    return card.suit + ":" + card.rank;
  }

  function prefersReduced() {
    return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function isCoral(card) {
    return card.suit === "hearts" || card.suit === "diamonds";
  }

  function buildIndex(card, corner) {
    var idx = document.createElement("span");
    var rank = document.createElement("span");
    var suit = document.createElement("span");
    idx.className = "idx " + corner;
    rank.className = "r";
    suit.className = "s";
    rank.textContent = rankLabel(card.rank);
    suit.textContent = SUIT_GLYPH[card.suit];
    idx.appendChild(rank);
    idx.appendChild(suit);
    return idx;
  }

  function buildFace(card) {
    var face = document.createElement("span");
    var pip = document.createElement("span");
    face.className = "face" + (isCoral(card) ? " is-coral" : "");
    face.setAttribute("aria-hidden", "true");
    pip.className = "pip";
    pip.textContent = SUIT_GLYPH[card.suit];
    face.appendChild(buildIndex(card, "tl"));
    face.appendChild(pip);
    face.appendChild(buildIndex(card, "br"));
    return face;
  }

  function setDrawn(card, quiet) {
    var face;
    var rect;
    lastDrawn = card && card.suit ? { suit: card.suit, rank: card.rank } : null;
    els.drawn.replaceChildren();
    if (!card) {
      els.drawn.classList.add("is-empty");
      els.drawn.setAttribute("aria-label", "No draw yet");
      return null;
    }
    els.drawn.classList.remove("is-empty");
    els.drawn.setAttribute("aria-label", "Last draw " + formatCard(card));
    face = buildFace(card);
    els.drawn.appendChild(face);
    rect = face.getBoundingClientRect();
    if (!quiet && !prefersReduced()) {
      face.classList.add("is-drawn");
    }
    return rect;
  }

  function setTone(tone) {
    if (tone === "hit" || tone === "miss" || tone === "win" || tone === "empty") {
      els.result.setAttribute("data-tone", tone);
    } else {
      els.result.removeAttribute("data-tone");
    }
  }

  function setResult(text, tone) {
    els.result.textContent = text;
    setTone(tone);
    els.result.classList.remove("is-in");
    syncPanelFade();
    if (!text || prefersReduced()) {
      return;
    }
    root.requestAnimationFrame(function () {
      els.result.classList.add("is-in");
    });
  }

  function syncPanelFade() {
    var panel = els.panel;
    if (!panel) {
      return;
    }
    panel.classList.toggle("is-clipped", panel.scrollHeight - panel.clientHeight - panel.scrollTop > 2);
  }

  function listCards(names) {
    if (names.length < 3) {
      return names.join(" or ");
    }
    return names.slice(0, -1).join(", ") + ", or " + names[names.length - 1];
  }

  function askFor(neighbors) {
    var names = neighbors.map(function (n) {
      return formatCard(n.card);
    });
    if (names.length === 1) {
      return "Higher or lower than " + names[0] + "?";
    }
    if (names.length === 2) {
      return "Inside or outside " + names[0] + " and " + names[1] + "?";
    }
    return "Same suit as " + listCards(names) + "?";
  }

  function restingStatus() {
    return G.isBoardFull(state.grid) ? "The table is full. You win." : "Choose a seat beside a card.";
  }

  function ensureGuessButtons() {
    var buttons = [els.guessA, els.guessB];
    var i;
    var btn;
    var kbd;
    var label;
    for (i = 0; i < buttons.length; i++) {
      btn = buttons[i];
      if (btn.querySelector(".guess-label")) {
        continue;
      }
      kbd = document.createElement("kbd");
      kbd.className = "key";
      kbd.setAttribute("aria-hidden", "true");
      kbd.textContent = String(i + 1);
      label = document.createElement("span");
      label.className = "guess-label";
      btn.replaceChildren(kbd, label);
    }
  }

  function hideGuesses() {
    var gen;
    root.clearTimeout(hideTimer);
    if (els.guessTray.hidden) {
      return;
    }
    if (prefersReduced()) {
      els.guessTray.classList.remove("is-out");
      els.guessTray.hidden = true;
      return;
    }
    gen = ++hideGen;
    els.guessTray.classList.add("is-out");
    hideTimer = root.setTimeout(function () {
      if (gen !== hideGen) {
        return;
      }
      els.guessTray.hidden = true;
      els.guessTray.classList.remove("is-out");
    }, 120);
  }

  function showGuesses(row, col) {
    var neighbors = G.occupiedNeighbors(state.grid, row, col);
    var options = G.guessOptions(neighbors.length);
    hideGen += 1;
    root.clearTimeout(hideTimer);
    els.guessTray.classList.remove("is-out");
    els.guessPrompt.textContent = askFor(neighbors);
    els.guessA.setAttribute("data-guess", options[0]);
    els.guessB.setAttribute("data-guess", options[1]);
    els.guessA.querySelector(".guess-label").textContent = GUESS_COPY[options[0]];
    els.guessB.querySelector(".guess-label").textContent = GUESS_COPY[options[1]];
    els.guessTray.hidden = false;
  }

  function placeTray(seat, row, col) {
    var tray = els.guessTray;
    var narrow = root.matchMedia("(max-width: 640px) and (orientation: portrait)").matches;
    var neighbors;
    var belowN;
    var aboveN;
    var i;
    var preferAbove;
    var trayRect;
    var seatRect;
    var gap;
    var left;
    var top;
    var origin;
    var flip;
    tray.classList.toggle("is-sheet", narrow);
    if (narrow) {
      tray.style.left = "";
      tray.style.top = "";
      tray.style.transformOrigin = "bottom center";
      return;
    }
    neighbors = G.occupiedNeighbors(state.grid, row, col);
    belowN = 0;
    aboveN = 0;
    for (i = 0; i < neighbors.length; i++) {
      if (neighbors[i].row > row) {
        belowN += 1;
      }
      if (neighbors[i].row < row) {
        aboveN += 1;
      }
    }
    preferAbove = belowN > aboveN;
    tray.style.left = "0px";
    tray.style.top = "0px";
    trayRect = tray.getBoundingClientRect();
    seatRect = seat.getBoundingClientRect();
    gap = 8;
    left = seatRect.left + seatRect.width / 2 - trayRect.width / 2;
    top = preferAbove ? seatRect.top - gap - trayRect.height : seatRect.bottom + gap;
    origin = preferAbove ? "bottom center" : "top center";
    if (top < 8 || top + trayRect.height > root.innerHeight - 8) {
      flip = preferAbove ? seatRect.bottom + gap : seatRect.top - gap - trayRect.height;
      if (flip >= 8 && flip + trayRect.height <= root.innerHeight - 8) {
        top = flip;
        origin = preferAbove ? "top center" : "bottom center";
      }
    }
    left = Math.max(8, Math.min(left, root.innerWidth - trayRect.width - 8));
    top = Math.max(8, Math.min(top, root.innerHeight - trayRect.height - 8));
    tray.style.left = Math.round(left) + "px";
    tray.style.top = Math.round(top) + "px";
    tray.style.transformOrigin = origin;
  }

  function labelFor(r, c, card, legal) {
    if (G.isOccupied(card)) {
      return formatCard(card) + " at row " + (r + 1) + " column " + (c + 1);
    }
    if (legal) {
      return "Empty legal seat, row " + (r + 1) + " column " + (c + 1);
    }
    return "Empty seat, row " + (r + 1) + " column " + (c + 1);
  }

  function syncSeat(r, c, card, flags) {
    var seat = seats[r][c];
    var key = cardKey(card);
    var realOccupied = G.isOccupied(state.grid[r][c]);
    var showing = G.isOccupied(card);
    var legal = !flags.held && !G.isBoardFull(state.grid) && G.isLegalCell(state.grid, r, c);
    var face;
    seat.setAttribute("data-legal", legal ? "true" : "false");
    seat.setAttribute("data-occupied", (showing || realOccupied) ? "true" : "false");
    seat.setAttribute("aria-disabled", legal ? "false" : "true");
    seat.setAttribute("aria-selected", selected && selected.row === r && selected.col === c ? "true" : "false");
    seat.setAttribute("aria-label", labelFor(r, c, showing ? card : state.grid[r][c], legal));
    seat.tabIndex = cursor.row === r && cursor.col === c ? 0 : -1;
    seat.classList.toggle("is-selected", !!(selected && selected.row === r && selected.col === c));
    seat.classList.toggle("is-neighbor", !!(neighborSet && neighborSet[r + "," + c]));
    if (seat.getAttribute("data-card") !== key) {
      if (!key) {
        seat.removeAttribute("data-card");
        seat.replaceChildren();
        seat.classList.remove("is-flying");
      } else {
        face = buildFace(card);
        if (flags.deal) {
          face.classList.add("is-dealt");
          face.style.animationDelay = (flags.delay || 0) + "ms";
        }
        seat.setAttribute("data-card", key);
        seat.replaceChildren(face);
        if (flags.place) {
          flyFrom(seat, face, flags.fromRect);
        }
      }
    }
    seat.classList.toggle("is-leaving", !!flags.held);
  }

  function flyFrom(seat, face, fromRect) {
    var to;
    var dx;
    var dy;
    var scale;
    if (prefersReduced() || !fromRect || fromRect.width < 1) {
      return;
    }
    to = face.getBoundingClientRect();
    if (to.width < 1) {
      return;
    }
    var flight = (seat.flightId || 0) + 1;
    dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
    dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
    scale = Math.max(0.45, Math.min(1, fromRect.width / to.width));
    seat.flightId = flight;
    seat.classList.add("is-flying");
    face.style.transition = "none";
    face.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
    root.requestAnimationFrame(function () {
      root.requestAnimationFrame(function () {
        face.style.transition = "";
        face.style.transform = "none";
      });
    });
    function land() {
      if (seat.flightId !== flight) {
        return;
      }
      face.style.transition = "";
      face.style.transform = "";
      seat.classList.remove("is-flying");
    }
    face.addEventListener("transitionend", function onEnd(event) {
      if (event.propertyName !== "transform") {
        return;
      }
      face.removeEventListener("transitionend", onEnd);
      land();
    });
    root.setTimeout(land, 280);
  }

  function paintAll(opts) {
    var r;
    var c;
    var id;
    var card;
    var flags;
    var deal;
    opts = opts || {};
    for (r = 0; r < G.SIZE; r++) {
      for (c = 0; c < G.SIZE; c++) {
        id = r + "," + c;
        card = held && held[id] ? held[id] : state.grid[r][c];
        deal = opts.deal && opts.deal[id];
        flags = {
          held: !!(held && held[id]),
          deal: !!deal,
          delay: deal ? deal.delay : 0,
          place: !!(opts.place && opts.place.row === r && opts.place.col === c),
          fromRect: opts.place ? opts.place.fromRect : null
        };
        syncSeat(r, c, card, flags);
      }
    }
    els.deckCount.textContent = String(state.deck.length);
    els.deck.setAttribute("aria-label", state.deck.length + (state.deck.length === 1 ? " card" : " cards") + " in the deck");
    els.filled.textContent = String(filledSeats(state.grid));
    document.body.classList.toggle("is-won", G.isBoardFull(state.grid));
    syncPanelFade();
  }

  function filledSeats(grid) {
    var count = 0;
    var r;
    var c;
    for (r = 0; r < G.SIZE; r++) {
      for (c = 0; c < G.SIZE; c++) {
        if (G.isOccupied(grid[r][c])) {
          count += 1;
        }
      }
    }
    return count;
  }

  function stripBoard() {
    var r;
    var c;
    var seat;
    for (r = 0; r < G.SIZE; r++) {
      for (c = 0; c < G.SIZE; c++) {
        seat = seats[r][c];
        seat.removeAttribute("data-card");
        seat.classList.remove("is-leaving", "is-selected", "is-neighbor", "is-flying");
        seat.replaceChildren();
      }
    }
  }

  function cancelTimers() {
    epoch += 1;
    if (clearTimer) {
      root.clearTimeout(clearTimer);
      clearTimer = 0;
    }
    held = null;
  }

  function snapBoard() {
    var dirty = !!(held || clearTimer);
    cancelTimers();
    if (dirty) {
      paintAll();
    }
  }

  function setCursor(r, c, moveFocus) {
    var prev = seats[cursor.row][cursor.col];
    cursor = { row: r, col: c };
    if (prev && prev !== seats[r][c]) {
      prev.tabIndex = -1;
    }
    seats[r][c].tabIndex = 0;
    if (moveFocus) {
      seats[r][c].focus({ preventScroll: true });
    }
  }

  function firstCursor() {
    var cells = G.legalCells(state.grid);
    if (cells.length) {
      return cells[0];
    }
    return { row: G.MIDDLE, col: 0 };
  }

  function crossCells(grid, row, col) {
    var list = [];
    var seen = {};
    var x;
    function add(rr, cc) {
      var id = rr + "," + cc;
      if (seen[id] || !G.isOccupied(grid[rr][cc])) {
        return;
      }
      seen[id] = true;
      list.push({ row: rr, col: cc, card: G.cloneCard(grid[rr][cc]) });
    }
    for (x = 0; x < G.SIZE; x++) {
      add(row, x);
      add(x, col);
    }
    return list;
  }

  function changedDeals(snapshot, grid) {
    var map = {};
    var r;
    var c;
    var now;
    var before;
    for (r = 0; r < G.SIZE; r++) {
      for (c = 0; c < G.SIZE; c++) {
        now = grid[r][c];
        before = snapshot[r][c];
        if (!G.isOccupied(now)) {
          continue;
        }
        if (!G.isOccupied(before) || before.suit !== now.suit || before.rank !== now.rank) {
          map[r + "," + c] = { delay: c * 12 };
        }
      }
    }
    return map;
  }

  function isCard(card) {
    return !!(
      card &&
      (card.suit === "hearts" || card.suit === "spades" || card.suit === "diamonds" || card.suit === "clubs") &&
      card.rank >= 1 &&
      card.rank <= 13 &&
      card.rank === Math.floor(card.rank)
    );
  }

  function claimCard(card, seen) {
    var id;
    if (!isCard(card)) {
      return false;
    }
    id = card.suit + ":" + card.rank;
    if (seen[id]) {
      return false;
    }
    seen[id] = true;
    return true;
  }

  function readSave() {
    var raw;
    var data;
    var seen;
    var count;
    var r;
    var c;
    var i;
    var card;
    try {
      raw = root.localStorage.getItem(STORE);
    } catch (err) {
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      data = JSON.parse(raw);
    } catch (err2) {
      return null;
    }
    if (!data || data.v !== 1 || !data.grid || !data.deck || data.grid.length !== 5) {
      return null;
    }
    seen = {};
    count = 0;
    for (r = 0; r < 5; r++) {
      if (!data.grid[r] || data.grid[r].length !== 5) {
        return null;
      }
      for (c = 0; c < 5; c++) {
        card = data.grid[r][c];
        if (!card) {
          continue;
        }
        if (!claimCard(card, seen)) {
          return null;
        }
        count += 1;
      }
    }
    for (i = 0; i < data.deck.length; i++) {
      if (!claimCard(data.deck[i], seen)) {
        return null;
      }
      count += 1;
    }
    if (data.drawn && !isCard(data.drawn)) {
      return null;
    }
    if (count < 1 || count > 52) {
      return null;
    }
    return data;
  }

  function save() {
    var payload;
    if (!state || !root.localStorage) {
      return;
    }
    payload = {
      v: 1,
      grid: state.grid,
      deck: state.deck,
      drawn: lastDrawn,
      result: els.result.textContent || "",
      tone: els.result.getAttribute("data-tone") || "",
      selected: selected ? { row: selected.row, col: selected.col } : null
    };
    try {
      root.localStorage.setItem(STORE, JSON.stringify(payload));
    } catch (err) {
      return;
    }
  }

  function savedText(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.slice(0, 180);
  }

  function closeGuess() {
    selected = null;
    neighborSet = null;
    hideGuesses();
    els.status.textContent = restingStatus();
    if (seats) {
      paintAll();
    }
    save();
  }

  function backOut(showRing) {
    var back = selected;
    closeGuess();
    if (back) {
      seats[back.row][back.col].focus({ preventScroll: true, focusVisible: showRing });
    }
  }

  function openGuess(row, col, focusChoice, quiet) {
    var neighbors;
    var i;
    selected = { row: row, col: col };
    neighborSet = {};
    neighbors = G.occupiedNeighbors(state.grid, row, col);
    for (i = 0; i < neighbors.length; i++) {
      neighborSet[neighbors[i].row + "," + neighbors[i].col] = true;
    }
    if (quiet) {
      els.guessTray.classList.add("is-instant");
    }
    els.status.textContent = askFor(neighbors);
    showGuesses(row, col);
    paintAll();
    placeTray(seats[row][col], row, col);
    if (focusChoice) {
      els.guessA.focus({ preventScroll: true });
    }
    if (quiet) {
      root.requestAnimationFrame(function () {
        els.guessTray.classList.remove("is-instant");
      });
    }
    save();
  }

  function guessOpen() {
    return !els.guessTray.hidden && !els.guessTray.classList.contains("is-out");
  }

  function onSeatClick(event) {
    var seat = event.currentTarget;
    var row = Number(seat.getAttribute("data-row"));
    var col = Number(seat.getAttribute("data-col"));
    snapBoard();
    setCursor(row, col, false);
    if (seat.getAttribute("data-legal") !== "true") {
      closeGuess();
      return;
    }
    setResult("");
    openGuess(row, col, event.detail === 0);
  }

  function finishClear(snapshot, token) {
    if (token !== epoch) {
      return;
    }
    clearTimer = 0;
    held = null;
    paintAll({ deal: prefersReduced() ? null : changedDeals(snapshot, state.grid) });
  }

  function onGuess(event) {
    var guess = event.currentTarget.getAttribute("data-guess");
    var playRow;
    var playCol;
    var snapshot;
    var drawn;
    var fromRect;
    var result;
    var keyboard;
    var leaving;
    var token;
    var i;
    if (!guessOpen() || !selected || !guess) {
      return;
    }
    playRow = selected.row;
    playCol = selected.col;
    snapshot = G.cloneGrid(state.grid);
    drawn = G.drawCard(state.deck);
    if (!drawn) {
      selected = null;
      neighborSet = null;
      hideGuesses();
      els.status.textContent = restingStatus();
      setResult("The deck is empty. Deal again.", "empty");
      paintAll();
      return;
    }
    fromRect = setDrawn(drawn);
    result = G.applyPlay(state, playRow, playCol, guess, drawn);
    state = result.state;
    keyboard = event.detail === 0;
    selected = null;
    neighborSet = null;
    hideGuesses();
    setCursor(playRow, playCol, keyboard);
    if (result.hit) {
      if (result.won) {
        setResult("The table is full. You win.", "win");
        els.status.textContent = "The table is full. You win.";
      } else {
        setResult("It stays. " + formatCard(result.drawn) + " takes the seat.", "hit");
        els.status.textContent = "Choose a seat beside a card.";
      }
      paintAll({
        place: {
          row: playRow,
          col: playCol,
          fromRect: fromRect
        }
      });
      save();
      return;
    }
    setResult("Miss. That row and column go back to the deck.", "miss");
    els.status.textContent = "Choose a seat beside a card.";
    leaving = crossCells(snapshot, playRow, playCol);
    save();
    if (prefersReduced() || !leaving.length) {
      paintAll({ deal: changedDeals(snapshot, state.grid) });
      return;
    }
    held = {};
    for (i = 0; i < leaving.length; i++) {
      held[leaving[i].row + "," + leaving[i].col] = leaving[i].card;
    }
    paintAll();
    token = epoch;
    clearTimer = root.setTimeout(function () {
      finishClear(snapshot, token);
    }, 210);
  }

  function moveCursor(dRow, dCol) {
    var row = cursor.row + dRow;
    var col = cursor.col + dCol;
    if (row < 0 || row > 4 || col < 0 || col > 4) {
      return;
    }
    setCursor(row, col, true);
  }

  function focusGuess(which) {
    (which < 0 ? els.guessA : els.guessB).focus({ preventScroll: true });
  }

  function onKey(event) {
    var key;
    var delta;
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.target && event.target.closest && event.target.closest("input, textarea, select")) {
      return;
    }
    if (event.key === "Escape") {
      if (!els.guessTray.hidden) {
        event.preventDefault();
        backOut(false);
      }
      return;
    }
    if (guessOpen() && (event.key === "1" || event.key === "2") && !event.repeat) {
      event.preventDefault();
      (event.key === "1" ? els.guessA : els.guessB).click();
      return;
    }
    if ((event.key === "n" || event.key === "N") && !guessOpen() && !event.repeat) {
      event.preventDefault();
      newDeal(true, true);
      return;
    }
    key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (guessOpen() && (key === "ArrowLeft" || key === "ArrowRight" || key === "a" || key === "d")) {
      event.preventDefault();
      if (event.target === els.guessA) {
        focusGuess(1);
      } else if (event.target === els.guessB) {
        focusGuess(-1);
      } else {
        focusGuess(key === "ArrowLeft" || key === "a" ? -1 : 1);
      }
      return;
    }
    if (guessOpen() && (key === "ArrowUp" || key === "ArrowDown" || key === "w" || key === "s")) {
      event.preventDefault();
      return;
    }
    delta = MOVE[key];
    if (!delta || guessOpen()) {
      return;
    }
    event.preventDefault();
    moveCursor(delta[0], delta[1]);
  }

  function onPointerDown(event) {
    var target = event.target;
    if (els.guessTray.hidden || els.guessTray.classList.contains("is-out")) {
      return;
    }
    if (target && target.closest && target.closest("#guess-tray, .seat")) {
      return;
    }
    closeGuess();
  }

  function onResize() {
    syncPanelFade();
    if (!guessOpen() || !selected) {
      return;
    }
    placeTray(seats[selected.row][selected.col], selected.row, selected.col);
  }

  function newDeal(animate, moveFocus) {
    var target;
    var deal = null;
    var c;
    cancelTimers();
    document.body.classList.remove("is-won");
    state = G.createGame();
    selected = null;
    neighborSet = null;
    setResult("");
    els.status.textContent = "Choose a seat beside a card.";
    setDrawn(null);
    hideGuesses();
    target = firstCursor();
    cursor = { row: target.row, col: target.col };
    if (animate && !prefersReduced()) {
      deal = {};
      for (c = 0; c < G.SIZE; c++) {
        deal[G.MIDDLE + "," + c] = { delay: c * 32 };
      }
    }
    stripBoard();
    paintAll({ deal: deal });
    setCursor(target.row, target.col, !!moveFocus);
    save();
  }

  function restore() {
    var data = readSave();
    var row;
    var col;
    var target;
    if (!data) {
      return false;
    }
    state = G.createGame({ grid: data.grid, deck: data.deck });
    selected = null;
    neighborSet = null;
    document.body.classList.remove("is-won");
    els.status.textContent = restingStatus();
    els.result.textContent = savedText(data.result);
    setTone(data.tone);
    setDrawn(data.drawn, true);
    row = data.selected && data.selected.row;
    col = data.selected && data.selected.col;
    if (row === Math.floor(row) && col === Math.floor(col) && G.isLegalCell(state.grid, row, col)) {
      cursor = { row: row, col: col };
      stripBoard();
      openGuess(row, col, false, true);
      return true;
    }
    target = firstCursor();
    cursor = { row: target.row, col: target.col };
    stripBoard();
    paintAll();
    setCursor(target.row, target.col, false);
    return true;
  }

  function buildSeats() {
    var r;
    var c;
    var seat;
    seats = [];
    els.board.replaceChildren();
    for (r = 0; r < G.SIZE; r++) {
      seats[r] = [];
      for (c = 0; c < G.SIZE; c++) {
        seat = document.createElement("button");
        seat.type = "button";
        seat.className = "seat";
        seat.setAttribute("role", "gridcell");
        seat.setAttribute("data-row", String(r));
        seat.setAttribute("data-col", String(c));
        seat.setAttribute("aria-rowindex", String(r + 1));
        seat.setAttribute("aria-colindex", String(c + 1));
        seat.tabIndex = -1;
        seat.addEventListener("click", onSeatClick);
        els.board.appendChild(seat);
        seats[r][c] = seat;
      }
    }
  }

  function boot() {
    G = root.FiveByFive;
    if (!G || !root.document) {
      return;
    }
    els.board = root.document.getElementById("board");
    els.status = root.document.getElementById("status");
    els.deckCount = root.document.getElementById("deck-count");
    els.deck = root.document.getElementById("deck");
    els.filled = root.document.getElementById("filled-count");
    els.drawn = root.document.getElementById("drawn-card");
    els.guessTray = root.document.getElementById("guess-tray");
    els.guessPrompt = root.document.getElementById("guess-prompt");
    els.guessA = root.document.getElementById("guess-a");
    els.guessB = root.document.getElementById("guess-b");
    els.result = root.document.getElementById("result");
    els.deal = root.document.getElementById("deal-again");
    els.again = root.document.getElementById("again");
    els.guessClose = root.document.getElementById("guess-close");
    els.panel = root.document.querySelector(".panel");
    if (!els.board || !els.guessA || !els.guessB || !els.deal || !els.deck || !els.filled || !els.again || !els.guessClose) {
      return;
    }
    ensureGuessButtons();
    els.guessA.addEventListener("click", onGuess);
    els.guessB.addEventListener("click", onGuess);
    els.deal.addEventListener("click", function (event) {
      newDeal(true, event.detail === 0);
    });
    els.again.addEventListener("click", function (event) {
      newDeal(true, event.detail === 0);
    });
    els.guessClose.addEventListener("click", function (event) {
      backOut(event.detail === 0);
    });
    if (els.panel) {
      els.panel.addEventListener("scroll", syncPanelFade, { passive: true });
    }
    root.document.addEventListener("keydown", onKey);
    root.document.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("resize", onResize);
    buildSeats();
    if (!restore()) {
      newDeal(false, false);
    }
  }

  root.FiveByFiveUI = {
    boot: boot,
    newDeal: function () {
      newDeal(true, false);
    }
  };

  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : this);
