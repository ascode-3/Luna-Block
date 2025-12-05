import { useAppContext } from "./context/AppContext";

import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import RoomListPage from "./pages/RoomListPage";
import CreateRoomPage from "./pages/CreateRoomPage";
import WaitingRoomPage from "./pages/WaitingRoomPage";
import TetrisPage from "./pages/TetrisPage";
import KeySettingsPage from "./pages/KeySettingsPage";

export default function MainApp() {
  const { page } = useAppContext();

  const renderPage = () => {
    switch (page) {
      case "login":
        return <LoginPage />;
      case "lobby":
        return <LobbyPage />;
      case "roomList":
        return <RoomListPage />;
      case "createRoom":
        return <CreateRoomPage />;
      case "waitingRoom":
        return <WaitingRoomPage />;
      case "tetris":
        return <TetrisPage />;
      case "keySettings":
        return <KeySettingsPage />;
      default:
        return <div>Unknown Page</div>;
    }
  };

  return <>{renderPage()}</>;
}
