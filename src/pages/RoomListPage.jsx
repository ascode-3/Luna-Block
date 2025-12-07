import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function RoomListPage() {
  const { socket, nickname, userId, setPage, setRoomId, setRoomInfo } =
    useAppContext();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!socket) {
      return;
    }

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
    if (!socket) {
      return;
    }

    const handleJoinRoomSuccess = ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomInfo(room);
      setPage("waitingRoom");
    };

    const handleJoinRoomError = (payload) => {
      const message = payload?.message || "방 참가에 실패했습니다.";
      alert(message);
    };

    socket.on("joinRoomSuccess", handleJoinRoomSuccess);
    socket.on("joinRoomError", handleJoinRoomError);

    return () => {
      socket.off("joinRoomSuccess", handleJoinRoomSuccess);
      socket.off("joinRoomError", handleJoinRoomError);
    };
  }, [socket, setRoomId, setRoomInfo, setPage]);

  const handleCreateRoomClick = () => {
    setPage("createRoom");
  };

  const handleJoinClick = (room) => {
    if (!socket || !userId || !nickname) return;

    if (room.isPrivate) {
      alert("비공개 방은 아직 지원하지 않습니다.");
      return;
    }

    socket.emit("joinRoom", {
      roomId: room.id,
      userId,
      nickname,
      password: "",
    });
  };

  if (!socket) {
    return (
      <div>
        <h2>방 목록</h2>
        <p>서버에 연결 중입니다. 잠시 후 다시 시도해주세요.</p>
        <button onClick={() => setPage("lobby")}>로비로 돌아가기</button>
      </div>
    );
  }

  return (
    <div>
      <h2>방 목록</h2>
      <button onClick={handleCreateRoomClick}>방 생성</button>
      {rooms.length === 0 ? (
        <p>생성된 방이 없습니다.</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              <button type="button" onClick={() => handleJoinClick(room)}>
                {room.name} ({room.participantCount}/{room.maxPlayers})
                {room.status === "playing" ? " [게임 중]" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setPage("lobby")}>로비로 돌아가기</button>
    </div>
  );
}
