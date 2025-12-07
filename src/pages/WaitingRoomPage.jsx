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

    const handleMoveToTetrisPage = ({ roomId: targetRoomId }) => {
      if (targetRoomId && targetRoomId !== roomId) return;
      setPage("multiTetris");
    };

    const handleGameStartConfirmation = ({ status, error }) => {
      if (status === "error") {
        alert(error || "게임을 시작할 수 없습니다.");
      }
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

  const handleLeaveRoom = () => {
    if (socket && roomId && userId) {
      socket.emit("leaveRoom", { roomId, userId });
    }
    setRoomId(null);
    setRoomInfo(null);
    setPage("roomList");
  };

  const handleStartGame = () => {
    if (!socket || !roomId || !userId) return;
    socket.emit("startGame", { roomId, userId });
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
  const playerCount = roomInfo.players?.length || 0;

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
        {isHost && (
          <button
            type="button"
            onClick={handleStartGame}
            disabled={playerCount < 2}
          >
            게임 시작
          </button>
        )}
        <button onClick={handleLeaveRoom}>나가기</button>
      </div>
    </div>
  );
}
