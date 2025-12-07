import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";

export default function WaitingRoomPage() {
  const { socket, roomId, roomInfo, setRoomInfo, userId, setPage, setRoomId } =
    useAppContext();

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    const handlePlayerJoined = ({ roomId: eventRoomId, players, hostId }) => {
      if (eventRoomId !== roomId) return;
      setRoomInfo((prev) =>
        prev ? { ...prev, players, hostId } : { id: roomId, players, hostId }
      );
    };

    const handlePlayerLeft = ({ roomId: eventRoomId, players, hostId }) => {
      if (eventRoomId !== roomId) return;
      setRoomInfo((prev) =>
        prev ? { ...prev, players, hostId } : { id: roomId, players, hostId }
      );
    };

    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerLeft", handlePlayerLeft);

    return () => {
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerLeft", handlePlayerLeft);
    };
  }, [socket, roomId, setRoomInfo]);

  const handleLeaveRoom = () => {
    if (socket && roomId && userId) {
      socket.emit("leaveRoom", { roomId, userId });
    }
    setRoomId(null);
    setRoomInfo(null);
    setPage("roomList");
  };

  if (!roomId || !roomInfo) {
    return (
      <div>
        <p>방 정보가 없습니다.</p>
        <button onClick={() => setPage("roomList")}>
          방 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const hostPlayer = roomInfo.players?.find(
    (player) => player.userId === roomInfo.hostId
  );
  const isHost = roomInfo.hostId === userId;

  return (
    <div>
      <h2>방 대기실</h2>
      <p>방 이름: {roomInfo.name || roomId}</p>
      <p>방장: {hostPlayer ? hostPlayer.name : "알 수 없음"}</p>
      <h3>참여자</h3>
      <ul>
        {roomInfo.players?.map((player) => (
          <li key={player.userId}>
            {player.name}
            {player.userId === roomInfo.hostId ? " (방장)" : ""}
          </li>
        ))}
      </ul>
      <div>
        {isHost && <button disabled>게임 시작 (아직 미구현)</button>}
        <button onClick={handleLeaveRoom}>나가기</button>
      </div>
    </div>
  );
}
