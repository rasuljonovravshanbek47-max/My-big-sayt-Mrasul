import { AnimatePresence, motion } from 'motion/react';
import { AuthModal } from './components/AuthModal';
import { GameLauncherModal } from './components/games/GameLauncherModal';
import { Navbar } from './components/Navbar';
import { PersistentMusicPlayer } from './components/PersistentMusicPlayer';
import { UniverseProvider, useUniverse } from './context/UniverseContext';
import { AdminView } from './views/AdminView';
import { DiscoverView } from './views/DiscoverView';
import { FavoritesView, PlaylistsView } from './views/FavoritesAndPlaylistsView';
import { GamesView } from './views/GamesView';
import { HomeView } from './views/HomeView';
import { MusicView } from './views/MusicView';
import { ProfileView, SettingsView } from './views/ProfileAndSettingsView';
import { SearchView } from './views/SearchView';

function UniverseShell() {
  const { activeTab, currentTrack, reducedMotion, setActiveTab } = useUniverse();

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'games':
        return <GamesView />;
      case 'music':
        return <MusicView />;
      case 'discover':
        return <DiscoverView />;
      case 'favorites':
        return <FavoritesView />;
      case 'playlists':
        return <PlaylistsView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'search':
        return <SearchView />;
      case 'admin':
        return <AdminView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#050814] dark:text-slate-100 transition-colors ${
        currentTrack ? 'pb-24' : ''
      }`}
    >
      <Navbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200 dark:border-white/10 mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-display font-bold text-slate-800 dark:text-slate-200">MRASUL UNIVERSE</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>ONE UNIVERSE. UNLIMITED ENTERTAINMENT.</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setActiveTab('games')} className="hover:text-cyan-400">
              Games
            </button>
            <button type="button" onClick={() => setActiveTab('music')} className="hover:text-cyan-400">
              Music
            </button>
            <button type="button" onClick={() => setActiveTab('discover')} className="hover:text-cyan-400">
              Discover
            </button>
            <button type="button" onClick={() => setActiveTab('settings')} className="hover:text-cyan-400">
              Age & Safety Settings
            </button>
          </div>
        </div>
      </footer>

      <GameLauncherModal />
      <AuthModal />
      <PersistentMusicPlayer />
    </div>
  );
}

export default function App() {
  return (
    <UniverseProvider>
      <UniverseShell />
    </UniverseProvider>
  );
}
