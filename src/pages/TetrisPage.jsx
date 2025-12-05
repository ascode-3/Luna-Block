import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";

export default function TetrisPage() {
  const { nickname, keyBindings, setPage } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key } = event;
      if (
        key === keyBindings.moveLeft ||
        key === keyBindings.moveRight ||
        key === keyBindings.softDrop ||
        key === keyBindings.hardDrop ||
        key === keyBindings.rotate
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keyBindings]);

  return (
    <div>
      <h2>1인 테트리스</h2>
      <p>닉네임: {nickname}</p>
      <div style={{ display: "flex", gap: "16px" }}>
        <div
          style={{
            width: "240px",
            height: "480px",
            border: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          필드 영역
        </div>
        <div>
          <h3>조작키</h3>
          <ul>
            <li>왼쪽 이동: {keyBindings.moveLeft}</li>
            <li>오른쪽 이동: {keyBindings.moveRight}</li>
            <li>소프트 드롭: {keyBindings.softDrop}</li>
            <li>하드 드롭: {keyBindings.hardDrop}</li>
            <li>회전: {keyBindings.rotate}</li>
          </ul>
        </div>
      </div>
      <button onClick={() => setPage("lobby")}>로비로 돌아가기</button>
    </div>
  );
}
