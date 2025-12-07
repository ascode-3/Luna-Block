import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

const actions = [
  { key: "moveLeft", label: "왼쪽 이동" },
  { key: "moveRight", label: "오른쪽 이동" },
  { key: "softDrop", label: "소프트 드롭" },
  { key: "hardDrop", label: "하드 드롭" },
  { key: "rotate", label: "회전" },
  { key: "hold", label: "홀드" },
];

export default function KeySettingsPage() {
  const { keyBindings, setKeyBindings, resetKeyBindings, setPage } = useAppContext();
  const [editingAction, setEditingAction] = useState(null);

  useEffect(() => {
    if (!editingAction) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      event.preventDefault();
      const { key } = event;
      setKeyBindings((prev) => ({
        ...prev,
        [editingAction]: key,
      }));
      setEditingAction(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingAction, setKeyBindings]);

  return (
    <div>
      <h2>조작키 설정</h2>
      <p>변경할 항목을 선택한 뒤 원하는 키를 입력하세요.</p>
      <table>
        <thead>
          <tr>
            <th>동작</th>
            <th>현재 키</th>
            <th>변경</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.key}>
              <td>{action.label}</td>
              <td>{keyBindings[action.key]}</td>
              <td>
                <button onClick={() => setEditingAction(action.key)}>
                  {editingAction === action.key ? "입력 대기 중..." : "변경"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
        <button onClick={resetKeyBindings}>기본값으로 초기화</button>
        <button onClick={() => setPage("lobby")}>
          로비로 돌아가기
        </button>
      </div>
    </div>
  );
}
