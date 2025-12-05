import { useAppContext } from "../context/AppContext";

export default function RoomListPage() {
  const { setPage } = useAppContext();

  return (
    <div>
      <h2>방 목록</h2>
      <p>멀티 테트리스 기능은 이후 단계에서 구현됩니다.</p>
      <button onClick={() => setPage("lobby")}>로비로 돌아가기</button>
    </div>
  );
}
