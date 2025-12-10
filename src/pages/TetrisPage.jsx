import { useEffect } from "react";
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key, repeat } = event;

      if (
        key === keyBindings.moveLeft ||
        key === keyBindings.moveRight ||
        key === keyBindings.softDrop ||
        key === keyBindings.hardDrop ||
        key === keyBindings.rotate ||
        key === keyBindings.hold
      ) {
        event.preventDefault();
      }

      if (!isGameStarted || gameOver) {
        return;
      }

      if (key === keyBindings.moveLeft) {
        moveLeft();
      } else if (key === keyBindings.moveRight) {
        moveRight();
      } else if (key === keyBindings.softDrop) {
        softDrop();
      } else if (key === keyBindings.hardDrop) {
        if (!repeat) {
          hardDrop();
        }
      } else if (key === keyBindings.rotate) {
        if (!repeat) {
          rotate();
        }
      } else if (key === keyBindings.hold) {
        if (!repeat) {
          hold();
        }
      } else if (key === "p" || key === "P" || key === "Escape") {
        if (!repeat) {
          togglePause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
        <div className="side-panel left-panel">
          <div className="panel-section">
            <h3>Hold</h3>
            <canvas ref={holdCanvasRef} className="preview-canvas" />
          </div>

          <div className="panel-section controls-panel">
            <h3>조작법</h3>
            <div className="controls-list">
              <p>
                  : 좌우 이동 ({keyBindings.moveLeft} / {keyBindings.moveRight})
              </p>
              <p> : 회전 ({keyBindings.rotate})</p>
              <p> : 소프트 드롭 ({keyBindings.softDrop})</p>
              <p>Space : 하드 드롭 ({keyBindings.hardDrop})</p>
              <p>Shift : 홀드 ({keyBindings.hold})</p>
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
                <h2>루나 블록 - 1인 테트리스</h2>
                <p>7줄을 클리어해 보세요!</p>
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
            <canvas ref={nextCanvasRef} className="next-canvas" />
          </div>
        </div>
      </div>
    </div>
  );
}
