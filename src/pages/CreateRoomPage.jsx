import { useAppContext } from "../context/AppContext";

export default function CreateRoomPage() {
  const { setPage } = useAppContext();

  return (
    <div>
      <h2>방 생성</h2>
      <p>방 이름, 인원수, 공개/비공개 설정 등은 이후에 구현됩니다.</p>
      <button onClick={() => setPage("roomList")}>방 목록으로 돌아가기</button>
    </div>
  );
}
