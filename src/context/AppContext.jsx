import { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext();

const defaultKeyBindings = {
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  softDrop: "ArrowDown",
  hardDrop: "Space",
  rotate: "ArrowUp",
};

export function AppProvider({ children }) {
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [userId, setUserId] = useState("");    
  const [roomId, setRoomId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // 인원 리스트 등
  const [socket, setSocket] = useState(null);
  const [keyBindings, setKeyBindings] = useState(() => {
    try {
      const stored = localStorage.getItem("keyBindings");
      return stored ? JSON.parse(stored) : defaultKeyBindings;
    } catch {
      return defaultKeyBindings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("keyBindings", JSON.stringify(keyBindings));
    } catch {
    }
  }, [keyBindings]);

  const resetKeyBindings = () => {
    setKeyBindings(defaultKeyBindings);
  };

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        nickname,
        setNickname,
        userId,
        setUserId,
        roomId,
        setRoomId,
        roomInfo,
        setRoomInfo,
        socket,
        setSocket,
        keyBindings,
        setKeyBindings,
        resetKeyBindings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
