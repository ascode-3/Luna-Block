import { BLOCK_SIZE, ROWS, COLS, GHOST_PIECE_OPACITY, COLORS } from "./constants";

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 0.8;

  for (let x = 0; x <= width; x += BLOCK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += BLOCK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawBlock(ctx, x, y, color) {
  const posX = x * BLOCK_SIZE;
  const posY = y * BLOCK_SIZE;

  const darkColors = {
    "#26c6da": "#00838f",
    "#ab47bc": "#6a1b9a",
    "#ff9800": "#e65100",
    "#5A5AC9": "#283593",
    "#ffee58": "#f9a825",
    "#7FBF5E": "#2e7d32",
    "#ef5350": "#b71c1c",
    "#555555": "#2a2a2a",
  };

  const darkColor = darkColors[color] || "#000000";

  ctx.fillStyle = color;
  ctx.fillRect(posX, posY, BLOCK_SIZE, BLOCK_SIZE);

  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(posX + 0.5, posY + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

  ctx.fillStyle = darkColor;
  ctx.fillRect(posX, posY + BLOCK_SIZE - 4, BLOCK_SIZE, 4);
  ctx.fillRect(posX + BLOCK_SIZE - 2, posY, 2, BLOCK_SIZE);
}

export function drawPreviewPiece(ctx, piece) {
  if (!piece) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const shapeWidth = piece.shape[0].length;
  const shapeHeight = piece.shape.length;

  const offsetX = (ctx.canvas.width - shapeWidth * BLOCK_SIZE) / 2;
  const offsetY = (ctx.canvas.height - shapeHeight * BLOCK_SIZE) / 2;

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const tileX = x + offsetX / BLOCK_SIZE;
        const tileY = y + offsetY / BLOCK_SIZE;
        drawBlock(ctx, tileX, tileY, piece.color);
      }
    });
  });
}

export function drawNextPieces(ctx, pieces) {
  if (!pieces || pieces.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const blockAreaHeight = BLOCK_SIZE * 3;

  pieces.forEach((piece, index) => {
    if (!piece) return;

    const shapeWidth = piece.shape[0].length;
    const shapeHeight = piece.shape.length;

    const startY = index * blockAreaHeight + 8;
    const offsetX = (ctx.canvas.width - shapeWidth * BLOCK_SIZE) / 2;
    const offsetY = startY + (blockAreaHeight - shapeHeight * BLOCK_SIZE) / 2;

    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const tileX = x + offsetX / BLOCK_SIZE;
          const tileY = y + offsetY / BLOCK_SIZE;
          drawBlock(ctx, tileX, tileY, piece.color);
        }
      });
    });
  });
}

export function drawBoard(ctx, grid, currentPiece, ghostPiece) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawGrid(ctx, ctx.canvas.width, ctx.canvas.height);

  grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(ctx, x, y, COLORS[value - 1]);
      }
    });
  });

  if (ghostPiece) {
    ctx.globalAlpha = GHOST_PIECE_OPACITY;
    ghostPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, ghostPiece.pos.x + x, ghostPiece.pos.y + y, ghostPiece.color);
        }
      });
    });
    ctx.globalAlpha = 1;
  }

  if (currentPiece) {
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, currentPiece.pos.x + x, currentPiece.pos.y + y, currentPiece.color);
        }
      });
    });
  }
}

export function clearLines(grid) {
  let linesCleared = 0;
  const linesToClear = [];

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (grid[y].every((cell) => cell !== 0)) {
      linesToClear.push(y);
      linesCleared += 1;
    }
  }

  if (linesToClear.length === 0) {
    return { newGrid: grid, linesCleared: 0, linesToClear: [] };
  }

  const newGrid = grid.filter((_, index) => !linesToClear.includes(index));

  for (let i = 0; i < linesToClear.length; i += 1) {
    newGrid.unshift(Array(COLS).fill(0));
  }

  return { newGrid, linesCleared, linesToClear };
}

export function mergePiece(grid, piece) {
  const newGrid = grid.map((row) => [...row]);

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const gridY = piece.pos.y + y;
      if (gridY >= 0 && gridY < ROWS) {
        newGrid[gridY][piece.pos.x + x] = COLORS.indexOf(piece.color) + 1;
      }
    });
  });

  return newGrid;
}
