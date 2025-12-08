import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import "./LoginPage.css"; // CSS 파일을 임포트합니다.

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
    <div className="login-container">
      <div className="glass-card">
        <h1 className="title">Luna Tetris</h1>
        <p className="subtitle">달의 가호가 함께 하기를</p>
        
        <div className="input-group">
          <input
            type="text"
            className="glass-input"
            placeholder="닉네임을 입력하세요"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} // 엔터키 편의성만 살짝 추가
          />
        </div>
        
        <button className="glass-button" onClick={handleLogin}>
          입장하기
        </button>
      </div>
    </div>
  );
}

export default LoginPage;