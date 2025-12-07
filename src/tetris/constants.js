// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 24;

// Colors for pieces
export const COLORS = [
  "#26c6da", // I piece – deep teal
  "#ab47bc", // T piece – deep lavender
  "#ff9800", // L piece – burnt orange
  "#5A5AC9", // J piece – royal blue
  "#ffee58", // O piece – goldenrod
  "#7FBF5E", // S piece – forest green
  "#ef5350", // Z piece – brick red
  "#555555", // garbage grey
];

// Visual settings
export const GHOST_PIECE_OPACITY = 0.3;

// Game mechanics
export const LOCK_DELAY = 500;
export const MAX_LOCK_MOVES = 15;
export const INITIAL_DROP_INTERVAL = 750;

// Tetromino shapes
export const SHAPES = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // T
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // L
  [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // J
  [
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // S
  [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // Z
  [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
];
