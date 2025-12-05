import { useAppContext } from "../context/AppContext";

export default function LobbyPage() {
  const { nickname, setPage } = useAppContext();

  return (
    <div>
      <h2>로비</h2>
      <p>닉네임: {nickname}</p>
      <div>
        <button onClick={() => setPage("tetris")}>
          1인 테트리스
        </button>
      </div>
      <div>
        <button onClick={() => setPage("roomList")}>
          멀티 테트리스
        </button>
      </div>
      <div>
        <button onClick={() => setPage("keySettings")}>
          조작키 설정
        </button>
      </div>
    </div>
  );
}
