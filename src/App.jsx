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
    <div className="bg-background mx-auto flex min-h-screen max-w-[480px] flex-col shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <Screen />
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
