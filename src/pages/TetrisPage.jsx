import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useSingleTetris } from "../hooks/useSingleTetris";

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
    <div>
      <h2>1인 테트리스</h2>
      <p>닉네임: {nickname}</p>
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {/* 왼쪽: Hold + 조작법 */}
        <div style={{ minWidth: 200, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3>Hold</h3>
            <canvas
              ref={holdCanvasRef}
              style={{ border: "1px solid #ccc", backgroundColor: "#000" }}
            />
          </div>
          <div>
            <h3>조작법</h3>
            <ul>
              <li>
                좌우 이동: {keyBindings.moveLeft} / {keyBindings.moveRight}
              </li>
              <li>회전: {keyBindings.rotate}</li>
              <li>소프트 드롭: {keyBindings.softDrop}</li>
              <li>하드 드롭: {keyBindings.hardDrop}</li>
              <li>홀드: {keyBindings.hold}</li>
              <li>일시정지: P 또는 Esc</li>
            </ul>
          </div>
        </div>

        {/* 중앙: 게임 보드 및 정보 */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div>
              <span>클리어 라인: </span>
              <strong>{linesCleared}</strong>
            </div>
            <div>
              <span>시간: </span>
              <strong>{formatTime(elapsedTime)}</strong>
            </div>
          </div>
          <div
            style={{
              position: "relative",
              border: "1px solid #ccc",
              display: "inline-block",
            }}
          >
            <canvas
              ref={gameBoardRef}
              style={{ display: "block", backgroundColor: "#000" }}
            />

            {!isGameStarted && !gameOver && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  gap: 12,
                }}
              >
                <h3>루나 블록 - 1인 테트리스</h3>
                <button onClick={startGame}>게임 시작</button>
                <button onClick={() => setPage("lobby")}>로비로 돌아가기</button>
              </div>
            )}

            {gameOver && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  gap: 12,
                }}
              >
                <h3>게임 오버</h3>
                <p>클리어한 라인: {linesCleared}</p>
                <p>플레이 시간: {formatTime(elapsedTime)}</p>
                <button onClick={restartGame}>다시 시작</button>
                <button onClick={() => setPage("lobby")}>
                  로비로 돌아가기
                </button>
              </div>
            )}

            {isPaused && !gameOver && isGameStarted && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  gap: 8,
                }}
              >
                <h3>일시정지</h3>
                <p>P 또는 Esc 키로 계속하기</p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: Next 4개 */}
        <div style={{ minWidth: 160 }}>
          <h3>Next</h3>
          <canvas
            ref={nextCanvasRef}
            style={{ border: "1px solid #ccc", backgroundColor: "#000" }}
          />
        </div>
      </div>
    </div>
  );
}
