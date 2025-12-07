import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function CreateRoomPage() {
  const { socket, nickname, userId, setPage, setRoomId, setRoomInfo } =
    useAppContext();

  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!socket || !userId || !nickname) return;
    if (isCreating) return;

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
      <div>
        <h2>방 생성</h2>
        <p>서버에 연결 중입니다. 잠시 후 다시 시도해주세요.</p>
        <button onClick={() => setPage("roomList")}>
          방 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>방 생성</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            방 이름:
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            최대 인원:
            <input
              type="number"
              min="2"
              max="50"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value) || 2)}
            />
          </label>
        </div>
        <div>
          <label>
            비공개 방:
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
          </label>
        </div>
        {isPrivate && (
          <div>
            <label>
              비밀번호:
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>
        )}
        <div>
          <button type="submit" disabled={isCreating}>
            {isCreating ? "생성 중..." : "생성하기"}
          </button>
          <button type="button" onClick={() => setPage("roomList")}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
