import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [userId, setUserId] = useState("");    
  const [roomId, setRoomId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // 인원 리스트 등
  const [socket, setSocket] = useState(null);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
