import { useState } from "react";
import { useAppContext } from "../context/AppContext";

function LoginPage() {
  const [localNickname, setLocalNickname] = useState("");
  const { setNickname, setPage, setUserId } = useAppContext();

  const handleLogin = () => {
    const trimmed = localNickname.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUserId(id);
    setNickname(trimmed);
    setPage("lobby");
  };

  return (
    <div>
      <h1>멀티 테트리스</h1>
      <input
        type="text"
        placeholder="닉네임 입력"
        value={localNickname}
        onChange={(e) => setLocalNickname(e.target.value)}
      />
      <button onClick={handleLogin}>입장하기</button>
    </div>
  );
}

export default LoginPage;
