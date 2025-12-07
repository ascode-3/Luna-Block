import { AppProvider } from "./context/AppContext";
import MainApp from "./MainApp";
import './app.css';

function App() {
  return (
    <AppProvider>
      <MainApp />  {/* 페이지 전환 로직 있는 컴포넌트 */}
    </AppProvider>
  );
}

export default App;
