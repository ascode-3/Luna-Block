import { useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useMultiTetris } from "../hooks/useMultiTetris";
import MiniTetrisBoard from "../components/MiniTetrisBoard";
import "../styles/MultiTetrisPage.css";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MultiTetrisPage() {
  const {
    socket,
    roomId,
    nickname,
    userId,
    keyBindings,
    setPage,
    setRoomId,
    setRoomInfo,
  } = useAppContext();

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
    togglePause,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
    hold,
    getCurrentGameState,
  } = useMultiTetris();

  const [otherPlayers, setOtherPlayers] = useState([]);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("tetrisPageLoaded", { roomId });
  }, [socket, roomId]);

  // 게임 자동 시작
  useEffect(() => {
    startGame();
  }, [startGame]);

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
      } else if (code=== keyBindings.softDrop) {
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

  // 상대 플레이어 상태 및 타겟, 승자 정보 수신
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleGameStateUpdate = ({ playerId, playerName, gameState }) => {
      if (playerId === userId) return;

      setOtherPlayers((prev) => {
        const idx = prev.findIndex((p) => p.id === playerId);
        const updated = {
          id: playerId,
          name: playerName || playerId,
          gameState,
        };
        if (idx === -1) {
          return [...prev, updated];
        }
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...updated,
        };
        return copy;
      });
    };

    const handlePlayerGameOver = ({ playerId }) => {
      if (playerId === userId) return;
      setOtherPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? { ...p, gameState: { ...p.gameState, isGameOver: true } }
            : p,
        ),
      );
    };

    const handlePlayerDisconnect = (playerId) => {
      setOtherPlayers((prev) => prev.filter((p) => p.id !== playerId));
    };

    const handleGameWin = ({ winner: winnerInfo }) => {
      setWinner(winnerInfo || null);
    };

    const handleTargetAssigned = ({ targetId, targetName }) => {
      setTargetPlayer({ id: targetId, name: targetName });
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("playerGameOver", handlePlayerGameOver);
    socket.on("playerDisconnect", handlePlayerDisconnect);
    socket.on("gameWin", handleGameWin);
    socket.on("targetAssigned", handleTargetAssigned);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("playerGameOver", handlePlayerGameOver);
      socket.off("playerDisconnect", handlePlayerDisconnect);
      socket.off("gameWin", handleGameWin);
      socket.off("targetAssigned", handleTargetAssigned);
    };
  }, [socket, roomId, userId]);

  // 주기적으로 내 게임 상태를 서버에 전송
  useEffect(() => {
    if (!socket || !roomId) return;

    const intervalId = setInterval(() => {
      const gameState = getCurrentGameState();
      socket.emit("updateGameState", { roomId, gameState });
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [socket, roomId, getCurrentGameState]);

  const handleContinue = useCallback(() => {
    if (socket && roomId) {
      socket.emit("restartGame", { roomId });
    }
    setPage("waitingRoom");
  }, [socket, roomId, setPage]);

  const handleLeaveGame = useCallback(() => {
    if (socket && roomId && userId) {
      socket.emit("leaveRoom", { roomId, userId });
    }
    setRoomId(null);
    setRoomInfo(null);
    setPage("roomList");
  }, [socket, roomId, userId, setRoomId, setRoomInfo, setPage]);

  if (!roomId) {
    return (
      <div>
        <p>방 정보가 없습니다.</p>
        <button type="button" onClick={() => setPage("roomList")}>
          방 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const aliveOpponents = otherPlayers.filter(
    (player) => !player.gameState?.isGameOver,
  );

  return (
    <div className="multi-tetris-page">
      <div className="multi-header">
        <h2>멀티 테트리스</h2>
        <p>
          닉네임: {nickname} / 방 ID: {roomId}
        </p>
      </div>

      <div className="multi-main-layout">
        {/* 왼쪽: Hold / Next / Target / 조작법 */}
        <div className="multi-side-panel">
          <div className="multi-panel">
            <h3>Hold</h3>
            <canvas ref={holdCanvasRef} className="multi-hold-canvas" />
          </div>

          <div className="multi-panel">
            <h3>Next</h3>
            <canvas ref={nextCanvasRef} className="multi-next-canvas" />
          </div>

          <div className="multi-panel">
            <h3>Target</h3>
            <p>{targetPlayer ? targetPlayer.name : "없음"}</p>
          </div>

          <div className="multi-panel">
            <h3>조작법</h3>
            <ul className="multi-controls-list">
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

        {/* 중앙: 내 필드 */}
        <div className="multi-center-panel">
          <div className="multi-game-info">
            <div>
              <span>클리어 라인: </span>
              <strong>{linesCleared}</strong>
            </div>
            <div>
              <span>시간: </span>
              <strong>{formatTime(elapsedTime)}</strong>
            </div>
          </div>

          <div className="multi-game-area">
            <canvas ref={gameBoardRef} className="multi-game-canvas" />

            {gameOver && (
              <div className="multi-overlay">
                <h3>게임 오버</h3>
                <p>결과는 잠시 후 갱신됩니다.</p>
              </div>
            )}

            {isPaused && !gameOver && isGameStarted && (
              <div className="multi-overlay">
                <h3>일시정지</h3>
                <p>P 또는 Esc 키로 계속하기</p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 상대 필드들 */}
        <div className="multi-opponent-panel">
          <div className="multi-panel">
            <h3>상대 필드</h3>
            {aliveOpponents.length === 0 ? (
              <p>다른 플레이어가 없습니다.</p>
            ) : (
              <div className="multi-opponent-grid">
                {aliveOpponents.map((player) => (
                  <div key={player.id} className="multi-opponent-item">
                    <div className="multi-opponent-name">{player.name}</div>
                    <MiniTetrisBoard gameState={player.gameState} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLeaveGame}
            className="multi-leave-button"
          >
            나가기 (방 목록)
          </button>
        </div>
      </div>

      {/* 승자 정보 및 계속하기 */}
      {winner && (
        <div className="multi-result-panel">
          <h3>게임 종료</h3>
          <p>
            {winner.id === userId
              ? "축하합니다! 당신이 우승했습니다."
              : `${winner.name}님이 우승했습니다.`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleContinue}>
              계속하기 (대기실)
            </button>
            <button type="button" onClick={handleLeaveGame}>
              나가기 (방 목록)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
