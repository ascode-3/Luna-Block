import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const AppContext = createContext();

const defaultKeyBindings = {
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  softDrop: "ArrowDown",
  hardDrop: "Space",
  rotate: "ArrowUp",
  hold: "hiftLeft",
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
      if (!stored) {
        return defaultKeyBindings;
      }
      const parsed = JSON.parse(stored);
      return { ...defaultKeyBindings, ...parsed };
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

  useEffect(() => {
    if (!nickname || !userId) {
      return;
    }

    const url = import.meta.env.VITE_SOCKET_SERVER_URL;
    if (!url) {
      console.warn("VITE_SOCKET_SERVER_URL is not set");
      return;
    }

    const newSocket = io(url, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [nickname, userId]);

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
