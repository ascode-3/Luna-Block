import { useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { useSingleTetris } from "../hooks/useSingleTetris";
import "../styles/SingleTetrisPage.css";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TetrisPage() {
  const { nickname, keyBindings, setPage } = useAppContext();

  const keyRepeatTimersRef = useRef({});

  const {
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
  } = useSingleTetris();
  // DAS (Delayed Auto Shift) 및 ARR (Auto Repeat Rate) 설정
  // DAS: 키를 누르고 있는 동안 처음 이동하기까지의 지연 시간
  // ARR: 키를 누르고 있는 동안 연속 이동하는 간격
  useEffect(() => {
    const DAS_MS = 150;
    const ARR_MS = 35;

    const clearRepeatForCode = (code) => {
      const entry = keyRepeatTimersRef.current[code];
      if (!entry) return;
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId);
      }
      if (entry.intervalId) {
        clearInterval(entry.intervalId);
      }
      delete keyRepeatTimersRef.current[code];
    };

    const clearAllRepeats = () => {
      Object.keys(keyRepeatTimersRef.current).forEach((code) => {
        clearRepeatForCode(code);
      });
    };

    const startDAS = (code, action) => {
      if (keyRepeatTimersRef.current[code]) return;

      action();

      const timeoutId = setTimeout(() => {
        const intervalId = setInterval(() => {
          action();
        }, ARR_MS);
        const entry = keyRepeatTimersRef.current[code];
        if (entry) {
          entry.intervalId = intervalId;
          entry.timeoutId = null;
        } else {
          clearInterval(intervalId);
        }
      }, DAS_MS);

      keyRepeatTimersRef.current[code] = { timeoutId, intervalId: null };
    };

    const handleKeyDown = (event) => {
      const { code, repeat } = event;

      if (
        code === keyBindings.moveLeft ||
        code === keyBindings.moveRight ||
        code === keyBindings.softDrop ||
        code === keyBindings.hardDrop ||
        code === keyBindings.rotate ||
        code === keyBindings.hold
      ) {
        event.preventDefault();
      }

      if (!isGameStarted || gameOver) {
        clearAllRepeats();
        return;
      }

      if (code === keyBindings.moveLeft) {
        if (!repeat) startDAS(code, moveLeft);
      } else if (code === keyBindings.moveRight) {
        if (!repeat) startDAS(code, moveRight);
      } else if (code === keyBindings.softDrop) {
        if (!repeat) startDAS(code, softDrop);
      } else if (code === keyBindings.hardDrop) {
        if (!repeat) {
          hardDrop();
        }
      } else if (code === keyBindings.rotate) {
        if (!repeat) {
          rotate();
        }
      } else if (code === keyBindings.hold) {
        if (!repeat) {
          hold();
        }
      } else if (code === "KeyP" || code === "Escape") {
        if (!repeat) {
          togglePause();
        }
      }
    };

    const handleKeyUp = (event) => {
      const { code } = event;
      if (
        code === keyBindings.moveLeft ||
        code === keyBindings.moveRight ||
        code === keyBindings.softDrop
      ) {
        clearRepeatForCode(code);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearAllRepeats);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearAllRepeats);
      clearAllRepeats();
    };
  }, [
    keyBindings,
    isGameStarted,
    gameOver,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
    hold,
    togglePause,
  ]);

  return (
    <div className="mini-tetris-container">
      <div className="game-layout">
        {/* 왼쪽: Hold + 조작법 + 방해 효과 */}
        <div className="side-panel">
          <div className="panel-section">
            <h3>Hold</h3>
            <canvas ref={holdCanvasRef}
             className="preview-canvas"
             width={96}
             height={96}
             />
          </div>

          <div className="panel-section controls-panel">
            <h3>조작법</h3>
            <div className="controls-list">
              <p>
                  : 좌우 이동 ({keyBindings.moveLeft} / {keyBindings.moveRight})
              </p>
              <p> : 회전 ({keyBindings.rotate})</p>
              <p> : 소프트 드롭 ({keyBindings.softDrop})</p>
              <p>하드 드롭 ({keyBindings.hardDrop})</p>
              <p>홀드 ({keyBindings.hold})</p>
              <p>P / Esc : 일시정지</p>
            </div>
          </div>
        </div>

        {/* 중앙: 게임 보드 및 정보 */}
        <div className="center-panel">
          <div className="game-info">
            <div className="info-item">
              <span className="info-label">라인:</span>
              <span className="info-value">{linesCleared}</span>
            </div>
            <div className="info-item">
              <span className="info-label">시간:</span>
              <span className="info-value">{formatTime(elapsedTime)}</span>
            </div>
          </div>

          <div className="game-area">
            <canvas ref={gameBoardRef} className="game-canvas" />

            {!isGameStarted && !gameOver && (
              <div className="game-overlay">
                <h2>루나 테트리스</h2>
                <p>본인의 실력을 무한 모드에서 테스트해 보세요!</p>
                <button onClick={startGame} className="start-button">
                  게임 시작
                </button>
                <div className="overlay-buttons">
                  <button
                    onClick={() => setPage("lobby")}
                    className="back-button"
                  >
                    로비로 돌아가기
                  </button>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="game-overlay">
                <h2>게임 오버</h2>
                <p className="final-info">클리어한 라인: {linesCleared}</p>
                <p className="final-info">
                  플레이 시간: {formatTime(elapsedTime)}
                </p>
                <button onClick={restartGame} className="restart-button">
                  다시 시작
                </button>
                <button
                  onClick={() => setPage("lobby")}
                  className="back-button"
                >
                  로비로 돌아가기
                </button>
              </div>
            )}

            {isPaused && !gameOver && isGameStarted && (
              <div className="game-overlay">
                <h2>일시정지</h2>
                <p>P 또는 Esc 키로 계속하기</p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: Next */}
        <div className="side-panel right-panel">
          <div className="panel-section next-panel">
            <h3>Next</h3>
            <canvas ref={nextCanvasRef} className="next-canvas"
            width={96}
             height={285}
             />
          </div>
        </div>
      </div>
    </div>
  );
}
