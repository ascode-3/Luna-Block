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
    restartGame,
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
  const [ranking, setRanking] = useState([]);

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
    const DAS_MS = 120;
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

    const handleGameWin = ({ winner: winnerInfo, ranking: rankingInfo, players }) => {
      setWinner(winnerInfo || null);
      if (Array.isArray(rankingInfo) && rankingInfo.length > 0) {
        setRanking(rankingInfo);
      } else if (Array.isArray(players)) {
        const fallback = players
          .map((p) => ({
            id: p.userId || p.id,
            name: p.name || p.nickname || "플레이어",
            linesCleared: 0,
          }))
          .slice(0, 5);
        setRanking(fallback);
      } else {
        setRanking([]);
      }
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

// 게임 재시작 / 강제 시작 시 결과 모달 닫고 상태 초기화
useEffect(() => {
  if (!socket || !roomId) return;

  const handleGameStartOrRestart = () => {
    setWinner(null);
    setRanking([]);
    setOtherPlayers([]);
    setTargetPlayer(null);
    restartGame();
  };

  socket.on("gameStart", handleGameStartOrRestart);
  socket.on("gameRestart", handleGameStartOrRestart);

  return () => {
    socket.off("gameStart", handleGameStartOrRestart);
    socket.off("gameRestart", handleGameStartOrRestart);
  };
}, [socket, roomId, restartGame]);

// 플레이어 퇴장 정보를 모달 화면에서도 반영하여 방 정보가 stale 되지 않도록 처리
useEffect(() => {
  if (!socket || !roomId) return;

  const handlePlayerLeft = ({ roomId: eventRoomId, userId: leftId, players }) => {
    if (eventRoomId && eventRoomId !== roomId) return;
    setOtherPlayers((prev) => prev.filter((p) => p.id !== leftId));
    if (players) {
      setRoomInfo((prev) =>
        prev ? { ...prev, players } : { id: roomId, players },
      );
    }
  };

  socket.on("playerLeft", handlePlayerLeft);

  return () => {
    socket.off("playerLeft", handlePlayerLeft);
  };
}, [socket, roomId, setRoomInfo]);

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

const MAX_VISIBLE_OPPONENTS = 12;

const aliveOpponents = otherPlayers.filter(
  (player) => !player.gameState?.isGameOver,
);
const visibleOpponents = aliveOpponents.slice(0, MAX_VISIBLE_OPPONENTS);

return (
  <div className="multi-tetris-page">
    <div className="multi-header">
    </div>

    <div className={`multi-main-layout ${winner ? 'blurred' : ''}`}>
      {/* 왼쪽: Hold / Next / Target / 조작법 */}
      <div className="multi-side-panel">
        <div className="multi-panel">
          <h3 className="panel-title-centered">Hold</h3>
          <canvas ref={holdCanvasRef} className="multi-hold-canvas" />
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
          </ul>
        </div>
      </div>

      {/* 중앙: 내 필드 */}
      <div className="multi-center-panel">
        <div className="multi-game-info">
          <div>
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

          <div className="multi-panel">
            <h3 className="panel-title-centered">Next</h3>
            <canvas ref={nextCanvasRef} className="multi-next-canvas" />
          </div>

        {/* 오른쪽: 상대 필드들 */}
        <div className="multi-opponent-panel">
          <div className="multi-panel-re">
            <h3 className="panel-title-centered">상대 필드</h3>
            <div className="multi-panel-mini"> 


            {aliveOpponents.length === 0 ? (
              <p>다른 플레이어가 없습니다.</p>
            ) : (
              <div className="multi-opponent-grid">
                {visibleOpponents.map((player) => (
                  <div key={player.id} className="multi-opponent-item">
                    <div className="multi-opponent-name">{player.name}</div>
                    <MiniTetrisBoard gameState={player.gameState} />
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>


        {/* 승자 정보 모달 */}
          {winner && (
            <div className="multi-modal-backdrop">
              <div className="multi-modal">
                <h3>게임 종료</h3>
                <p style={{ fontSize: "16px", marginBottom: "16px" }}>
                  {winner.id === userId
                    ? "🎉 축하합니다! 당신이 우승했습니다!"
                    : `🏆 ${winner.name}님이 우승했습니다.`}
                </p>
                {ranking && ranking.length > 0 && (
                  <div className="multi-ranking">
                    <h4 style={{ marginBottom: "8px" }}>순위 (클리어 라인)</h4>
                    <div className="multi-ranking-list">
                      {ranking.map((entry, idx) => (
                        <div key={entry.id} className="multi-ranking-row">
                          <span className="rank-order">{idx + 1}위</span>
                          <span className="rank-name">{entry.name}</span>
                          <span className="rank-lines">
                            클리어 라인: {entry.linesCleared ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="multi-modal-actions">
                  <button type="button" onClick={handleContinue}>
                    계속하기 (대기실)
                  </button>
                  <button type="button" onClick={handleLeaveGame}>
                    나가기 (방 목록)
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}