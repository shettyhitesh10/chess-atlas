# Chess Atlas

A 3D chess game explorer. Height represents time: every half-move adds a level, each piece traces its entire journey, and captured pieces stop at their capture square and height.

## Run locally

Requires Node.js 18 or newer. No installation or build is required.

1. Open a terminal in this folder.
2. Run `node server.mjs`.
3. Open http://127.0.0.1:4173/ in a browser with WebGL support.

The static `dist/` folder can also be hosted with any static web server. Opening index.html directly as a file is not supported because the app uses JavaScript modules.

## Explore

- Paste or upload one PGN game, including PGN with a FEN starting position.
- Click pieces to add or remove their paths, or use Add a piece. Several paths can stay highlighted together. Remove individual chips, clear the selection, or select an entire side. The board dims while paths are selected.
- Path colors offers Moonlight (one color for all paths) or White / Black (amber and blue). Both modes work with any number of selected paths.
- Enable Only selected path to hide the other paths.
- Captured pieces remain at their final square and time. Rewind to restore them.
- Scrub the slider, click moves in the history, or use the playback buttons.
- Arrow keys step through the game, Space plays or pauses, Home/End jump to the beginning/end.
- Drag to orbit, scroll to zoom, right-drag to pan. On touch screens, drag to orbit and use two fingers to zoom/pan.
- Board view shows the current position and flattens the selected paths onto the normal board.
- Timeline height changes vertical spacing and reframes the camera. Piece size adjusts the models independently.
- Smooth piece motion animates pieces and growing trails, including simultaneous castling and captures. It starts disabled when the browser requests reduced motion.
- Playback has Forward, Reverse, and continuous Back & forth modes, from 0.5x through 10x. The normal speed is one half-move per 850 ms. Back & forth reverses smoothly at each endpoint. Speed and direction can change while playing.
- The expand button opens the player in fullscreen, with an in-page theater fallback. Escape exits the expanded view.
- Captured models end just below their capture plane and automatically fit into the available time gap, leaving space for the capturing piece. The path endpoint remains at the exact capture time.

The Opera Game is included as an example. PGN is parsed in the browser, never uploaded. The main line is replayed; annotations and side variations are not displayed. Time is measured in half-moves, not clock time. A file must contain a single game under 1 MB. Uploaded games are held for the current session only.

## Validation

Run `node tests.mjs` to check the sample game, stable piece identity, captures and backward replay, castling, en passant, promotion, FEN setup, annotation parsing, invalid notation, snapshot consistency, continuous interpolation, capture spacing, knight orientation, multi-selection, flattened board trails, side colors, and continuous playback timing at 10x.

## Files and dependencies

- `dist/model.js`: PGN parsing and piece histories using chess.js 1.0.0.
- `dist/scene.js`: procedural Staunton-style models and Three.js 0.170.0 rendering.
- `dist/app.js`: controls and replay UI.
- `dist/vendor/`: bundled libraries and their licenses.

Google Fonts supplies the optional typefaces; system fonts are used if unavailable. Everything else is self-contained.
