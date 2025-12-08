import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { motion } from "framer-motion";
import "./LobbyPage.css";

export default function LobbyPage() {
  const { setPage } = useAppContext();
  
  // exitState: 화면 전환 중인지(isExiting), 어떤 버튼을 눌렀는지(clickedId) 체크
  const [exitState, setExitState] = useState({ isExiting: false, clickedId: null });

  const handleNavigate = (targetPage, id) => {
    setExitState({ isExiting: true, clickedId: id });

    // 0.5초(500ms) 동안 애니메이션을 보여준 뒤 페이지 이동
    setTimeout(() => {
      setPage(targetPage);
    }, 500);
  };

  const menuItems = [
    { id: "single", label: "1인 테트리스", target: "tetris" },
    { id: "multi", label: "멀티 테트리스", target: "roomList" },
    { id: "setting", label: "조작키 설정", target: "keySettings" },
  ];

  return (
    <div className="lobby-background">
      {/* 1. 일반 div를 motion.div로 변경했습니다.
         2. exitState.isExiting 상태에 따라 투명도(opacity)와 크기(scale)가 변합니다.
      */}
      <motion.div 
        className="glass-container"
        initial={{ opacity: 0, y: 20 }} // (옵션) 처음 등장할 때 아래에서 서서히 나타남
        animate={
          exitState.isExiting 
            ? { opacity: 0, scale: 0.95, filter: "blur(10px)" } // 사라질 때: 흐려지면서 작아짐
            : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } // 평소 상태
        }
        transition={{ duration: 0.5, ease: "easeInOut" }} // 버튼 애니메이션 시간과 맞춤
      >
        <h2 className="lobby-title">Lobby</h2>
        
        <div className="button-group">
          {menuItems.map((item) => {
            const isClicked = exitState.clickedId === item.id;
            
            return (
              <motion.button
                key={item.id}
                className="glass-button"
                onClick={() => !exitState.isExiting && handleNavigate(item.target, item.id)}
                
                // 버튼 애니메이션 (기존과 동일)
                initial={{ x: 0, opacity: 1 }}
                animate={
                  exitState.isExiting
                    ? isClicked
                      ? { x: 100, opacity: 0 }  // 클릭된 건 오른쪽으로
                      : { x: -100, opacity: 0 } // 나머지는 왼쪽으로
                    : { x: 0, opacity: 1 }
                }
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {item.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}