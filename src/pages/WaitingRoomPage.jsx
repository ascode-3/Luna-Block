import { useAppContext } from "../context/AppContext";

export default function WaitingRoomPage() {
  const { setPage } = useAppContext();

  return (
    <div>
      <h2>방 대기실</h2>
      <p>참여자 목록, 방장 표시, 게임 시작 버튼 등은 이후에 구현됩니다.</p>
      <button onClick={() => setPage("roomList")}>방 목록으로 돌아가기</button>
    </div>
  );
}
