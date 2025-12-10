import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { motion } from "framer-motion";
import "../styles/KeySettingsPage.css"; // 스타일 파일 분리

const actions = [
  { key: "moveLeft", label: "왼쪽 이동" },
  { key: "moveRight", label: "오른쪽 이동" },
  { key: "softDrop", label: "소프트 드롭" },
  { key: "hardDrop", label: "하드 드롭" },
  { key: "rotate", label: "회전" },
  { key: "hold", label: "홀드" },
];

function formatKeyLabel(key) {
  if (!key) return "";
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (key === "ArrowUp") return "↑";
  if (key === "ArrowDown") return "↓";
  if (key === "ArrowLeft") return "←";
  if (key === "ArrowRight") return "→";
  return key.length === 1 ? key.toUpperCase() : key;
}

export default function KeySettingsPage() {
  const { keyBindings, setKeyBindings, resetKeyBindings, setPage } = useAppContext();
  const [editingAction, setEditingAction] = useState(null);
  
  // 퇴장 애니메이션 상태 관리
  const [isExiting, setIsExiting] = useState(false);

  // 로비로 돌아가기 핸들러
  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      setPage("lobby");
    }, 500); // 0.5초 뒤 페이지 전환
  };

  useEffect(() => {
    if (!editingAction) return undefined;

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
    <div className="lobby-background">
      <motion.div 
        className="glass-container settings-container"
        // 등장 및 퇴장 애니메이션 (로비와 통일감)
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={
          isExiting 
            ? { opacity: 0, scale: 0.9, filter: "blur(10px)" } 
            : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <h2 className="lobby-title">Controls</h2>
        <p className="settings-desc">변경할 항목을 클릭하고 키를 입력하세요</p>

        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>동작</th>
                <th>현재 키</th>
                <th style={{ width: "100px" }}>설정</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => {
                const isEditing = editingAction === action.key;
                return (
                  <tr key={action.key} className={isEditing ? "editing-row" : ""}>
                    <td>{action.label}</td>
                    <td className="key-value">
                        {/* 키 값이 돋보이도록 배지 스타일 적용 */}
                        <span className="key-badge">
                            {formatKeyLabel(keyBindings[action.key])}
                        </span>
                    </td>
                    <td>
                      <button 
                        className={`small-glass-button ${isEditing ? "active" : ""}`}
                        onClick={() => setEditingAction(action.key)}
                      >
                        {isEditing ? "입력..." : "변경"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="settings-footer">
          <button className="glass-button secondary" onClick={resetKeyBindings}>
            초기화
          </button>
          <button className="glass-button primary" onClick={handleBack}>
            로비로 가기
          </button>
        </div>
      </motion.div>
    </div>
  );
}