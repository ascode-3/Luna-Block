import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/WaitingRoomPage.css"; // 스타일 파일

export default function WaitingRoomPage() {
  const { socket, roomId, roomInfo, setRoomInfo, userId, setPage, setRoomId } = useAppContext();
  const [isExiting, setIsExiting] = useState(false); // 퇴장 애니메이션 상태

  // --- 기존 소켓 로직 (유지) ---
  useEffect(() => {
    if (!socket || !roomId) return;

    const handlePlayerJoined = ({ roomId: eventRoomId, players, hostId }) => {
      if (eventRoomId !== roomId) return;
      setRoomInfo((prev) => (prev ? { ...prev, players, hostId } : { id: roomId, players, hostId }));
    };
    const handlePlayerLeft = ({ roomId: eventRoomId, players, hostId }) => {
      if (eventRoomId !== roomId) return;
      setRoomInfo((prev) => (prev ? { ...prev, players, hostId } : { id: roomId, players, hostId }));
    };
    const handleMoveToTetrisPage = ({ roomId: targetRoomId }) => {
      if (targetRoomId && targetRoomId !== roomId) return;
      // 페이지 이동 시 애니메이션 없이 즉시 이동 (게임 시작)
      setPage("multiTetris");
    };
    const handleGameStartConfirmation = ({ status, error }) => {
      if (status === "error") alert(error || "게임을 시작할 수 없습니다.");
    };

    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerLeft", handlePlayerLeft);
    socket.on("moveToTetrisPage", handleMoveToTetrisPage);
    socket.on("gameStartConfirmation", handleGameStartConfirmation);

    return () => {
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerLeft", handlePlayerLeft);
      socket.off("moveToTetrisPage", handleMoveToTetrisPage);
      socket.off("gameStartConfirmation", handleGameStartConfirmation);
    };
  }, [socket, roomId, setRoomInfo, setPage]);

  // --- 핸들러 (나가기 버튼에 애니메이션 적용) ---
  const handleLeaveRoom = () => {
    if (socket && roomId && userId) {
      socket.emit("leaveRoom", { roomId, userId });
    }
    setIsExiting(true);
    setTimeout(() => {
        setRoomId(null);
        setRoomInfo(null);
        setPage("roomList");
    }, 300);
  };

  const handleStartGame = () => {
    if (!socket || !roomId || !userId) return;
    socket.emit("startGame", { roomId, userId });
  };

  // --- 예외 처리 (방 정보 없음) ---
  if (!roomId || !roomInfo) {
    return (
      <div className="lobby-background">
        <div className="glass-container">
          <p>방 정보가 없습니다.</p>
          <button className="glass-button secondary" onClick={() => setPage("roomList")}>
            방 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const hostPlayer = roomInfo.players?.find((player) => player.userId === roomInfo.hostId);
  const isHost = roomInfo.hostId === userId;
  const playerCount = roomInfo.players?.length || 0;

  // --- 메인 레이아웃 ---
  return (
    <div className="lobby-background waiting-room-layout">
      {/* 왼쪽 패널 (대기실 정보) */}
      <motion.div 
        className="glass-container left-panel"
        initial={{ opacity: 0, x: -50 }}
        animate={
          isExiting 
            ? { opacity: 0, x: -50, filter: "blur(10px)" } 
            : { opacity: 1, x: 0, filter: "blur(0px)" }
        }
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* 방 정보 헤더 */}
        <div className="room-header">
            <h2 className="lobby-title">{roomInfo.name || "무제"}</h2>
            <div className="room-meta">
                <span className="host-badge">👑 방장: {hostPlayer ? hostPlayer.name : "알 수 없음"}</span>
                <span className="player-count-badge">
                    👥 {playerCount} / {roomInfo.maxPlayers}
                </span>
            </div>
        </div>

        {/* 참여자 목록 (플레이어 카드) */}
        <div className="player-list-area">
            <h3>참여자 목록</h3>
            <div className="player-grid">
                <AnimatePresence>
                    {roomInfo.players?.map((player) => (
                        <motion.div 
                            key={player.userId}
                            className={`player-card ${player.userId === userId ? 'me' : ''}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            layout
                        >
                            <div className="player-avatar">
                                {player.userId === roomInfo.hostId ? "👑" : "👤"}
                            </div>
                            <span className="player-name">{player.name}</span>
                            {player.userId === userId && <span className="me-badge">나</span>}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
        
        {/* 하단 버튼 그룹 */}
        <div className="waiting-room-footer">
            <button className="glass-button secondary" onClick={handleLeaveRoom}>
                나가기
            </button>
            {isHost && (
                <button
                    type="button"
                    className={`glass-button primary start-btn ${playerCount < 2 ? 'disabled' : ''}`}
                    onClick={handleStartGame}
                    disabled={playerCount < 2}
                >
                    {playerCount < 2 ? `게임 시작 (2인 이상)` : "게임 시작!"}
                </button>
            )}
        </div>
      </motion.div>

      {/* 오른쪽 패널 (채팅 영역 - 추후 구현 예정) */}
      <div className="right-panel-placeholder">
          {/* 나중에 여기에 채팅 컴포넌트가 들어갑니다 */}
      </div>
    </div>
  );
}