import { useStore } from './store.jsx';
import { BottomNav, Toast } from './components.jsx';
import Home from './screens/Home.jsx';
import NewSession from './screens/NewSession.jsx';
import History from './screens/History.jsx';
import Stats from './screens/Stats.jsx';
import Friends from './screens/Friends.jsx';
import Settings from './screens/Settings.jsx';

const SCREENS = {
  home: Home,
  new: NewSession,
  history: History,
  stats: Stats,
  friends: Friends,
  settings: Settings,
};

export default function App() {
  const { tab } = useStore();
  const Screen = SCREENS[tab] || Home;
  return (
    <div className="shell">
      <div className="scroll">
        <Screen />
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
