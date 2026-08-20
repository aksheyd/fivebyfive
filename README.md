<div align="center">

# Five by Five

A card game I learned from my cousins.

[Play](#play) • [Rules](#rules) • [Tests](#tests)

<img src="./docs/images/screenshot.png" alt="Five by Five table with the middle row dealt and a higher-or-lower guess open" width="720" />

</div>

Fill a 5×5 grid of cards on a dining-table surface. Open `index.html` in a browser, or serve the folder and visit [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

## Play

```
python3 main.py
```

> [!TIP]
> You can also open `index.html` directly. No install, no build.

## Rules

The middle row is always dealt first. Play empty seats that sit beside at least one card.

- One neighbor: guess **higher** or **lower** than that rank.
- Two neighbors: guess **inside** or **outside** the range they form.
- Three or four neighbors: guess **same** suit as a neighbor, or **different**.

A hit places the drawn card. A miss sends that row and column back to the deck, then the middle row is refilled. Fill every seat to win.

## Tests

```
npm test
```

That runs the shipped-rules tests plus script-load and source checks.

The table photograph was created with Grok.
