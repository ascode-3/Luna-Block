import { COLS, SHAPES, COLORS } from "./constants";

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Generate new bag of pieces
export function generateBag() {
  const indices = Array.from({ length: SHAPES.length }, (_, i) => i);
  return shuffleArray(indices);
}

// Rotation states for SRS
const ROTATION_STATES = [
  // I
  [
    [[0, 0, 0, 0],[1, 1, 1, 1],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 0, 1, 0],[0, 0, 1, 0],[0, 0, 1, 0],[0, 0, 1, 0]],
    [[0, 0, 0, 0],[0, 0, 0, 0],[1, 1, 1, 1],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[0, 1, 0, 0],[0, 1, 0, 0],[0, 1, 0, 0]],
  ],
  // T
  [
    [[0, 1, 0, 0],[1, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[0, 1, 1, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
    [[0, 0, 0, 0],[1, 1, 1, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[1, 1, 0, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
  ],
  // L
  [
    [[0, 0, 1, 0],[1, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[0, 1, 0, 0],[0, 1, 1, 0],[0, 0, 0, 0]],
    [[0, 0, 0, 0],[1, 1, 1, 0],[1, 0, 0, 0],[0, 0, 0, 0]],
    [[1, 1, 0, 0],[0, 1, 0, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
  ],
  // J
  [
    [[1, 0, 0, 0],[1, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 1, 0],[0, 1, 0, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
    [[0, 0, 0, 0],[1, 1, 1, 0],[0, 0, 1, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[0, 1, 0, 0],[1, 1, 0, 0],[0, 0, 0, 0]],
  ],
  // O
  [
    [[0, 1, 1, 0],[0, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 1, 0],[0, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 1, 0],[0, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 1, 0],[0, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
  ],
  // S
  [
    [[0, 1, 1, 0],[1, 1, 0, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[0, 1, 1, 0],[0, 0, 1, 0],[0, 0, 0, 0]],
    [[0, 0, 0, 0],[0, 1, 1, 0],[1, 1, 0, 0],[0, 0, 0, 0]],
    [[1, 0, 0, 0],[1, 1, 0, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
  ],
  // Z
  [
    [[1, 1, 0, 0],[0, 1, 1, 0],[0, 0, 0, 0],[0, 0, 0, 0]],
    [[0, 0, 1, 0],[0, 1, 1, 0],[0, 1, 0, 0],[0, 0, 0, 0]],
    [[0, 0, 0, 0],[1, 1, 0, 0],[0, 1, 1, 0],[0, 0, 0, 0]],
    [[0, 1, 0, 0],[1, 1, 0, 0],[1, 0, 0, 0],[0, 0, 0, 0]],
  ],
];

const JLSTZ_WALL_KICKS = {
  "0->1": [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  "1->0": [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  "1->2": [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  "2->1": [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  "2->3": [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
  "3->2": [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]],
  "3->0": [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]],
  "0->3": [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
};

const I_WALL_KICKS = {
  "0->1": [[0, 0], [-2, 0], [+1, 0], [-2, -1], [+1, +2]],
  "1->0": [[0, 0], [+2, 0], [-1, 0], [+2, +1], [-1, -2]],
  "1->2": [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
  "2->1": [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]],
  "2->3": [[0, 0], [+2, 0], [-1, 0], [+2, +1], [-1, -2]],
  "3->2": [[0, 0], [-2, 0], [+1, 0], [-2, -1], [+1, +2]],
  "3->0": [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]],
  "0->3": [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
};

const O_WALL_KICKS = {
  "0->1": [[0, 0]],
  "1->0": [[0, 0]],
  "1->2": [[0, 0]],
  "2->1": [[0, 0]],
  "2->3": [[0, 0]],
  "3->2": [[0, 0]],
  "3->0": [[0, 0]],
  "0->3": [[0, 0]],
};

export function createPiece(typeId) {
  return {
    pos: {
      x: Math.floor(COLS / 2) - 2,
      y: typeId === 0 ? -1 : 0,
    },
    shape: ROTATION_STATES[typeId][0],
    color: COLORS[typeId],
    type: typeId,
    orientation: 0,
  };
}

export function getGhostPosition(piece, grid) {
  const ghost = {
    pos: { x: piece.pos.x, y: piece.pos.y },
    shape: piece.shape,
    color: piece.color,
  };

  while (!checkCollision(ghost, grid)) {
    ghost.pos.y += 1;
  }
  ghost.pos.y -= 1;

  return ghost;
}

export function checkCollision(piece, grid) {
  return piece.shape.some((row, dy) =>
    row.some((value, dx) => {
      if (!value) return false;
      const newX = piece.pos.x + dx;
      const newY = piece.pos.y + dy;
      return (
        newX < 0 ||
        newX >= COLS ||
        newY >= grid.length ||
        (newY >= 0 && grid[newY][newX])
      );
    }),
  );
}

export function rotatePiece(piece, grid, dir = 1) {
  const currentOrientation = piece.orientation;
  const newOrientation = (currentOrientation + dir + 4) % 4;

  let wallKicks;
  if (piece.type === 0) {
    wallKicks = I_WALL_KICKS;
  } else if (piece.type === 4) {
    wallKicks = O_WALL_KICKS;
  } else {
    wallKicks = JLSTZ_WALL_KICKS;
  }

  const kickKey = `${currentOrientation}->${newOrientation}`;
  const kicks = wallKicks[kickKey] || [[0, 0]];

  for (const [dx, dy] of kicks) {
    const testPiece = {
      ...piece,
      shape: ROTATION_STATES[piece.type][newOrientation],
      orientation: newOrientation,
      pos: {
        x: piece.pos.x + dx,
        y: piece.pos.y - dy,
      },
    };

    if (!checkCollision(testPiece, grid)) {
      return testPiece;
    }
  }

  return null;
}
