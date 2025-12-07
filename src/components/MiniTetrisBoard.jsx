import { useEffect, useRef } from "react";
import { COLS, ROWS, COLORS } from "../tetris/constants";

const MINI_BOARD_WIDTH = COLS;
const MINI_BOARD_HEIGHT = ROWS;
const MINI_BLOCK_SIZE = 8;

export default function MiniTetrisBoard({ gameState }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext("2d");
    canvas.width = MINI_BOARD_WIDTH * MINI_BLOCK_SIZE;
    canvas.height = MINI_BOARD_HEIGHT * MINI_BLOCK_SIZE;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawCell = (x, y, color) => {
      const px = x * MINI_BLOCK_SIZE;
      const py = y * MINI_BLOCK_SIZE;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, MINI_BLOCK_SIZE, MINI_BLOCK_SIZE);
    };

    const { grid, currentPiece } = gameState;

    if (grid) {
      grid.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const colorIndex = typeof value === "number" ? value - 1 : 0;
            const color = COLORS[colorIndex] || "#777";
            drawCell(x, y, color);
          }
        });
      });
    }

    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            drawCell(currentPiece.pos.x + x, currentPiece.pos.y + y, currentPiece.color);
          }
        });
      });
    }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        backgroundColor: "#000",
        border: "1px solid #333",
        display: "block",
      }}
    />
  );
}
