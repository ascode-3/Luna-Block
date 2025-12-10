import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion"; // 애니메이션
import "../styles/CreateRoomPage.css"; // 스타일 파일

export default function CreateRoomPage() {
  const { socket, nickname, userId, setPage, setRoomId, setRoomInfo } = useAppContext();

  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isExiting, setIsExiting] = useState(false); // 퇴장 애니메이션 상태

  // --- 기존 소켓 로직 ---
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = ({ roomId, room }) => {
      setIsCreating(false);
      setRoomId(roomId);
      setRoomInfo(room);
      setPage("waitingRoom");
    };

    const handleRoomCreateError = (payload) => {
      const message = payload?.message || "방 생성에 실패했습니다.";
      alert(message);
      setIsCreating(false);
    };

    socket.on("roomCreated", handleRoomCreated);
    socket.on("roomCreateError", handleRoomCreateError);

    return () => {
      socket.off("roomCreated", handleRoomCreated);
      socket.off("roomCreateError", handleRoomCreateError);
    };
  }, [socket, setRoomId, setRoomInfo, setPage]);

  // --- 핸들러 ---
  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      setPage("roomList");
    }, 500);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!socket || !userId || !nickname) return;
    if (isCreating) return;

    // 간단한 유효성 검사 (선택 사항)
    if (!roomName.trim()) {
        alert("방 이름을 입력해주세요.");
        return;
    }

    setIsCreating(true);
    socket.emit("createRoom", {
      roomName,
      maxPlayers,
      isPrivate,
      password: isPrivate ? password : "",
      userId,
      nickname,
    });
  };

  if (!socket) {
    return (
      <div className="lobby-background">
        <div className="glass-container">
           <h2>연결 중...</h2>
           <button className="glass-button secondary" onClick={() => setPage("roomList")}>
             돌아가기
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-background">
      <motion.div 
        className="glass-container create-room-container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={
          isExiting 
            ? { opacity: 0, scale: 0.9, filter: "blur(10px)" } 
            : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <h2 className="lobby-title">Create Room</h2>
        
        <form onSubmit={handleSubmit} className="glass-form">
          {/* 방 이름 입력 */}
          <div className="form-group">
            <label>방 이름</label>
            <input
              type="text"
              className="glass-input"
              placeholder="방 이름을 입력하세요"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
            />
          </div>

          {/* 최대 인원 입력 */}
          <div className="form-group">
            <label>최대 인원 (2~50)</label>
            <input
              type="number"
              className="glass-input"
              min="2"
              max="50"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value) || 2)}
            />
          </div>

          {/* 비공개 설정 (토글 스위치 디자인) */}
          <div className="form-group toggle-group">
            <label>비공개 방 설정</label>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isPrivate} 
                onChange={(e) => setIsPrivate(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* 비밀번호 입력 (비공개일 때만 부드럽게 등장) */}
          <AnimatePresence>
            {isPrivate && (
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label>비밀번호</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 버튼 영역 */}
          <div className="form-actions">
            <button 
              type="button" 
              className="glass-button secondary" 
              onClick={!isCreating ? handleBack : undefined}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="glass-button primary" 
              disabled={isCreating}
            >
              {isCreating ? "생성 중..." : "생성하기"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}