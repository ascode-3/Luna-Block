import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion"; // 애니메이션
import "../styles/RoomListPage.css"; // 스타일 파일

export default function RoomListPage() {
  const { socket, nickname, userId, setPage, setRoomId, setRoomInfo } = useAppContext();
  const [rooms, setRooms] = useState([]);
  const [isExiting, setIsExiting] = useState(false); // 화면 퇴장 상태

  // --- 기존 로직 유지 ---
  useEffect(() => {
    if (!socket) return;

    const handleRoomListResponse = (list) => {
      setRooms(list || []);
    };
    const handleRoomListUpdated = () => {
      socket.emit("getRoomList");
    };

    socket.on("roomListResponse", handleRoomListResponse);
    socket.on("roomListUpdated", handleRoomListUpdated);
    socket.emit("getRoomList");

    return () => {
      socket.off("roomListResponse", handleRoomListResponse);
      socket.off("roomListUpdated", handleRoomListUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleJoinRoomSuccess = ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomInfo(room);
      setPage("waitingRoom");
    };
    const handleJoinRoomError = (payload) => {
      alert(payload?.message || "방 참가에 실패했습니다.");
    };

    socket.on("joinRoomSuccess", handleJoinRoomSuccess);
    socket.on("joinRoomError", handleJoinRoomError);

    return () => {
      socket.off("joinRoomSuccess", handleJoinRoomSuccess);
      socket.off("joinRoomError", handleJoinRoomError);
    };
  }, [socket, setRoomId, setRoomInfo, setPage]);

  // --- 핸들러 함수들 ---
  const handleNavigate = (target) => {
    setIsExiting(true);
    setTimeout(() => {
      setPage(target);
    }, 500);
  };

  const handleJoinClick = (room) => {
    if (!socket || !userId || !nickname) return;
    if (room.isPrivate) {
      alert("비공개 방은 아직 지원하지 않습니다.");
      return;
    }
    // 게임 중이면 입장 불가 처리 (선택 사항)
    if (room.status === "playing") {
        alert("이미 게임이 진행 중인 방입니다.");
        return;
    }

    socket.emit("joinRoom", {
      roomId: room.id,
      userId,
      nickname,
      password: "",
    });
  };

  // --- 애니메이션 설정 ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 } // 리스트 아이템들이 0.1초 간격으로 등장
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  // --- 소켓 연결 안 됨 (로딩/에러) 화면 ---
  if (!socket) {
    return (
      <div className="lobby-background">
        <div className="glass-container">
          <h2>연결 중...</h2>
          <p style={{marginBottom: '20px', color: '#ccc'}}>서버와 통신하고 있습니다.</p>
          <button className="glass-button secondary" onClick={() => setPage("lobby")}>
            로비로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // --- 메인 화면 렌더링 ---
  return (
    <div className="lobby-background">
      <motion.div 
        className="glass-container room-list-container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={
          isExiting 
            ? { opacity: 0, scale: 0.9, filter: "blur(10px)" } 
            : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="room-list-header">
            <h2 className="lobby-title">Room List</h2>
            <div className="header-actions">
                <button 
                    className="glass-button primary small-btn" 
                    onClick={() => !isExiting && handleNavigate("createRoom")}
                >
                    + 방 만들기
                </button>
            </div>
        </div>

        {/* 방 목록 리스트 영역 */}
        <div className="room-scroll-area">
            {rooms.length === 0 ? (
                <div className="empty-state">
                    <p>현재 생성된 방이 없습니다.</p>
                    <p className="sub-text">새로운 방을 만들어보세요!</p>
                </div>
            ) : (
                <motion.div 
                    className="room-grid"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    <AnimatePresence>
                        {rooms.map((room) => (
                            <motion.div 
                                key={room.id} 
                                variants={itemVariants}
                                layout // 리스트 순서 변경 시 부드럽게 이동
                                className={`room-card ${room.status === 'playing' ? 'playing' : ''}`}
                                onClick={() => handleJoinClick(room)}
                            >
                                <div className="room-info">
                                    <span className="room-name">{room.name}</span>
                                    <span className="room-count">
                                        👤 {room.participantCount} / {room.maxPlayers}
                                    </span>
                                </div>
                                <div className="room-status-badge">
                                    {room.status === "playing" ? (
                                        <span className="badge red">게임 중</span>
                                    ) : (
                                        <span className="badge green">대기 중</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>

        <div className="room-list-footer">
            <button 
                className="glass-button secondary" 
                onClick={() => !isExiting && handleNavigate("lobby")}
            >
                로비로 돌아가기
            </button>
        </div>
      </motion.div>
    </div>
  );
}