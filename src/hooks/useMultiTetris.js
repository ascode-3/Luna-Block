import { useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import {
  ROWS,
  COLS,
  BLOCK_SIZE,
  INITIAL_DROP_INTERVAL,
  LOCK_DELAY,
  MAX_LOCK_MOVES,
  COLORS,
} from "../tetris/constants";
import {
  createPiece,
  generateBag,
  checkCollision,
  getGhostPosition,
  rotatePiece,
} from "../tetris/tetrisPiece";
import {
  clearLines,
  mergePiece,
  drawBoard,
  drawPreviewPiece,
  drawNextPieces,
} from "../tetris/tetrisBoard";

export function useMultiTetris() {
  const { socket, roomId } = useAppContext();

  const [linesCleared, setLinesCleared] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timerIntervalRef = useRef(null);
  const linesClearedRef = useRef(0);
  const gameOverRef = useRef(false);
  const isGameStartedRef = useRef(false);
  const isPausedRef = useRef(false);

  const gridRef = useRef(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const currentPieceRef = useRef(null);
  const holdPieceRef = useRef(null);
  const pieceBagRef = useRef([]);
  const canHoldRef = useRef(true);
  const dropCounterRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lockDelayTimerRef = useRef(0);
  const isLockingRef = useRef(false);
  const moveCounterRef = useRef(0);
  const dropIntervalRef = useRef(INITIAL_DROP_INTERVAL);
  const animationFrameIdRef = useRef(null);

  const gameBoardRef = useRef(null);
  const holdCanvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const nextPiecesRef = useRef([]);

  useEffect(() => {
    isGameStartedRef.current = isGameStarted;
  }, [isGameStarted]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  const updatePreviewDisplays = useCallback(() => {
    if (holdCanvasRef.current) {
      const ctx = holdCanvasRef.current.getContext("2d");
      drawPreviewPiece(ctx, holdPieceRef.current);
    }
    if (nextCanvasRef.current) {
      const ctx = nextCanvasRef.current.getContext("2d");
      drawNextPieces(ctx, nextPiecesRef.current);
    }
  }, []);

  const getNextPieceFromBag = useCallback(() => {
    if (pieceBagRef.current.length === 0) {
      pieceBagRef.current = generateBag();
    }
    return createPiece(pieceBagRef.current.pop());
  }, []);

  const spawnPiece = useCallback(() => {
    if (nextPiecesRef.current.length === 0) {
      for (let i = 0; i < 4; i += 1) {
        nextPiecesRef.current.push(getNextPieceFromBag());
      }
    }

    currentPieceRef.current = nextPiecesRef.current.shift();
    nextPiecesRef.current.push(getNextPieceFromBag());

    if (
      currentPieceRef.current &&
      checkCollision(currentPieceRef.current, gridRef.current)
    ) {
      setGameOver(true);
      setIsGameStarted(false);
      isGameStartedRef.current = false;
      gameOverRef.current = true;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // 서버에 게임 오버 알림
      if (socket && roomId) {
        const score = linesClearedRef.current;
        socket.emit("gameOver", { roomId, score });
      }
      return false;
    }

    updatePreviewDisplays();
    return true;
  }, [getNextPieceFromBag, updatePreviewDisplays, socket, roomId]);

  const sendLinesCleared = useCallback(
    (clearedCount) => {
      if (!socket || !roomId) return;
      if (!clearedCount || clearedCount <= 0) return;
      socket.emit("lineCleared", { roomId, linesCleared: clearedCount });
    },
    [socket, roomId],
  );

  const moveLeft = useCallback(() => {
    if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current)
      return;

    currentPieceRef.current.pos.x -= 1;
    if (checkCollision(currentPieceRef.current, gridRef.current)) {
      currentPieceRef.current.pos.x += 1;
      return;
    }
    if (isLockingRef.current) {
      lockDelayTimerRef.current = 0;
      moveCounterRef.current += 1;
    }
  }, []);

  const moveRight = useCallback(() => {
    if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current)
      return;

    currentPieceRef.current.pos.x += 1;
    if (checkCollision(currentPieceRef.current, gridRef.current)) {
      currentPieceRef.current.pos.x -= 1;
      return;
    }
    if (isLockingRef.current) {
      lockDelayTimerRef.current = 0;
      moveCounterRef.current += 1;
    }
  }, []);

  const addGarbageLines = useCallback((count) => {
    if (count <= 0) return;

    for (let i = 0; i < count; i += 1) {
      // 맨 위 줄 삭제
      gridRef.current.shift();
      // 랜덤 구멍 위치
      const hole = Math.floor(Math.random() * COLS);
      const garbageIndex = COLORS.length; // COLORS의 마지막 인덱스를 가비지로 사용
      const newRow = Array.from({ length: COLS }, (_, idx) =>
        idx === hole ? 0 : garbageIndex,
      );
      gridRef.current.push(newRow);
    }

    if (currentPieceRef.current) {
      currentPieceRef.current.pos.y = Math.max(
        currentPieceRef.current.pos.y - count,
        0,
      );
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveGarbage = ({ lines }) => {
      addGarbageLines(lines);
    };

    socket.on("receiveGarbage", handleReceiveGarbage);

    return () => {
      socket.off("receiveGarbage", handleReceiveGarbage);
    };
  }, [socket, addGarbageLines]);

  const softDrop = useCallback(() => {
    if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current)
      return;

    currentPieceRef.current.pos.y += 1;
    if (checkCollision(currentPieceRef.current, gridRef.current)) {
      currentPieceRef.current.pos.y -= 1;

      if (!isLockingRef.current) {
        isLockingRef.current = true;
        lockDelayTimerRef.current = 0;
        moveCounterRef.current = 0;
      }

      if (
        lockDelayTimerRef.current >= LOCK_DELAY ||
        moveCounterRef.current >= MAX_LOCK_MOVES
      ) {
        gridRef.current = mergePiece(gridRef.current, currentPieceRef.current);
        const { newGrid, linesCleared: clearedCount } = clearLines(
          gridRef.current,
        );
        gridRef.current = newGrid;

        if (clearedCount > 0) {
          const newTotal = linesClearedRef.current + clearedCount;
          linesClearedRef.current = newTotal;
          setLinesCleared(newTotal);
          sendLinesCleared(clearedCount);
        }

        spawnPiece();
        canHoldRef.current = true;
        isLockingRef.current = false;
        moveCounterRef.current = 0;
      }
    } else {
      isLockingRef.current = false;
      lockDelayTimerRef.current = 0;
      moveCounterRef.current = 0;
    }
    dropCounterRef.current = 0;
  }, [spawnPiece, sendLinesCleared]);

  const hardDrop = useCallback(() => {
    if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current)
      return;

    while (!checkCollision(currentPieceRef.current, gridRef.current)) {
      currentPieceRef.current.pos.y += 1;
    }
    currentPieceRef.current.pos.y -= 1;

    gridRef.current = mergePiece(gridRef.current, currentPieceRef.current);
    const { newGrid, linesCleared: clearedCount } = clearLines(gridRef.current);
    gridRef.current = newGrid;

    if (clearedCount > 0) {
      const newTotal = linesClearedRef.current + clearedCount;
      linesClearedRef.current = newTotal;
      setLinesCleared(newTotal);
      sendLinesCleared(clearedCount);
    }

    spawnPiece();
    canHoldRef.current = true;
    isLockingRef.current = false;
    moveCounterRef.current = 0;
    lockDelayTimerRef.current = 0;
  }, [spawnPiece, sendLinesCleared]);

  const rotate = useCallback(() => {
    if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current)
      return;

    const rotatedPiece = rotatePiece(currentPieceRef.current, gridRef.current);
    if (rotatedPiece) {
      currentPieceRef.current = rotatedPiece;
      if (isLockingRef.current) {
        lockDelayTimerRef.current = 0;
        moveCounterRef.current += 1;
      }
    }
  }, []);

  const hold = useCallback(() => {
    if (!canHoldRef.current || !currentPieceRef.current) return;
    if (!isGameStartedRef.current || isPausedRef.current) return;

    if (!holdPieceRef.current) {
      holdPieceRef.current = {
        shape: currentPieceRef.current.shape,
        color: currentPieceRef.current.color,
        type: currentPieceRef.current.type,
        orientation: 0,
      };
      spawnPiece();
    } else {
      const temp = {
        shape: currentPieceRef.current.shape,
        color: currentPieceRef.current.color,
        type: currentPieceRef.current.type,
        orientation: 0,
      };
      currentPieceRef.current = {
        pos: {
          x:
            Math.floor(COLS / 2) -
            Math.floor(holdPieceRef.current.shape[0].length / 2),
          y: 0,
        },
        shape: holdPieceRef.current.shape,
        color: holdPieceRef.current.color,
        type: holdPieceRef.current.type,
        orientation: 0,
      };
      holdPieceRef.current = temp;
    }

    canHoldRef.current = false;
    updatePreviewDisplays();
  }, [spawnPiece, updatePreviewDisplays]);

  const gameLoop = useCallback(
    (time = 0) => {
      if (!isGameStartedRef.current || gameOverRef.current || isPausedRef.current) {
        if (!gameOverRef.current && isGameStartedRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        }
        return;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      dropCounterRef.current += deltaTime;
      if (isLockingRef.current) {
        lockDelayTimerRef.current += deltaTime;
      }

      if (dropCounterRef.current > dropIntervalRef.current) {
        softDrop();
      }

      if (gameBoardRef.current) {
        const ctx = gameBoardRef.current.getContext("2d");
        const ghostPiece = currentPieceRef.current
          ? getGhostPosition(currentPieceRef.current, gridRef.current)
          : null;
        drawBoard(ctx, gridRef.current, currentPieceRef.current, ghostPiece);
      }

      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    },
    [softDrop],
  );

  const startGame = useCallback(() => {
    if (isGameStartedRef.current) return;
    if (!gameBoardRef.current || !holdCanvasRef.current || !nextCanvasRef.current)
      return;

    setGameOver(false);
    gameOverRef.current = false;
    setIsGameStarted(true);
    isGameStartedRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setLinesCleared(0);
    linesClearedRef.current = 0;
    setElapsedTime(0);

    dropIntervalRef.current = INITIAL_DROP_INTERVAL;
    dropCounterRef.current = 0;
    lastTimeRef.current = 0;
    lockDelayTimerRef.current = 0;
    isLockingRef.current = false;
    nextPiecesRef.current = [];
    moveCounterRef.current = 0;
    canHoldRef.current = true;

    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    holdPieceRef.current = null;
    pieceBagRef.current = generateBag();

    const spawnSuccess = spawnPiece();
    if (!spawnSuccess) {
      setIsGameStarted(false);
      isGameStartedRef.current = false;
      return;
    }

    const gameBoard = gameBoardRef.current;
    const holdCanvas = holdCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;

    gameBoard.width = COLS * BLOCK_SIZE;
    gameBoard.height = ROWS * BLOCK_SIZE;
    holdCanvas.width = holdCanvas.height = 4 * BLOCK_SIZE;
    nextCanvas.width = 4 * BLOCK_SIZE;
    nextCanvas.height = 12 * BLOCK_SIZE;

    const gameCtx = gameBoard.getContext("2d");
    gameCtx.fillStyle = "#000";
    gameCtx.fillRect(0, 0, gameBoard.width, gameBoard.height);

    drawBoard(gameCtx, gridRef.current, currentPieceRef.current, null);
    updatePreviewDisplays();

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current && isGameStartedRef.current) {
        setElapsedTime((prev) => prev + 1);
      }
    }, 1000);
  }, [spawnPiece, gameLoop, updatePreviewDisplays]);

  const restartGame = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setIsGameStarted(false);
    isGameStartedRef.current = false;
    setGameOver(false);
    gameOverRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;

    setTimeout(() => {
      startGame();
    }, 0);
  }, [startGame]);

  const togglePause = useCallback(() => {
    if (!gameOverRef.current && isGameStartedRef.current) {
      setIsPaused((prev) => !prev);
    }
  }, []);

  const getCurrentGameState = useCallback(
    () => ({
      grid: gridRef.current.map((row) => [...row]),
      currentPiece: currentPieceRef.current,
      isGameOver: gameOverRef.current,
    }),
    [],
  );

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  return {
    linesCleared,
    elapsedTime,
    isGameStarted,
    gameOver,
    isPaused,
    gameBoardRef,
    holdCanvasRef,
    nextCanvasRef,
    startGame,
    restartGame,
    togglePause,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
    hold,
    getCurrentGameState,
  };
}
