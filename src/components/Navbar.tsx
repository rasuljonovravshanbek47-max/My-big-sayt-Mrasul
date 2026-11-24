import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Clock,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useUniverse, type NavTab } from '../context/UniverseContext';

const RECENT_SEARCH_KEY = 'mrasul_recent_searches';

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Games' },
  { id: 'music', label: 'Music' },
  { id: 'discover', label: 'Discover' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
];

const QUICK_SUGGESTIONS = ['Minecraft', 'Racing', 'Football', 'Messi', 'Puzzle', 'Uzbek Music', 'Electronic'];

export function Navbar() {
  const {
    user,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    notifications,
    markNotificationsRead,
    setAuthModalOpen,
    searchQuery,
    setSearchQuery,
  } = useUniverse();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const triggerSearch = (q: string) => {
    const trimmed = q.trim();
    setSearchQuery(trimmed);
    if (trimmed) {
      setRecentSearches((prev) => {
        const next = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
        try {
          localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setActiveTab('search');
      setSearchFocused(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#050814]/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="font-display text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          MRASUL <span className="text-cyan-500">UNIVERSE</span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-5 text-sm font-medium" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {active && <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-cyan-500 rounded-full" />}
              </button>
            );
          })}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`inline-flex items-center gap-1 py-1 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'admin' ? 'text-amber-400' : 'text-amber-500/80 hover:text-amber-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Global Search Bar */}
        <div ref={searchWrapRef} className="relative flex-1 max-w-xs sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerSearch(searchQuery);
            }}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 0 && activeTab !== 'search') {
                  setActiveTab('search');
                }
              }}
              placeholder="Search games, songs, artists..."
              aria-label="Global search"
              className="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(true);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {searchFocused && (
            <div className="absolute left-0 right-0 top-11 z-40 rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/15 shadow-2xl p-3 space-y-3">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem(RECENT_SEARCH_KEY);
                      }}
                      className="hover:text-cyan-400"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => triggerSearch(item)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/15 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Instant Suggestions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => triggerSearch(s)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/20 text-xs text-slate-700 dark:text-cyan-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !notifOpen;
                setNotifOpen(next);
                if (next && unreadCount > 0) markNotificationsRead();
              }}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-cyan-400 leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-40 w-72 rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/15 shadow-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs font-semibold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                  <button type="button" onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No notifications yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 text-xs">
                        <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile / Sign In */}
          {user ? (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap shrink-0"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950"
                style={{ backgroundColor: user.avatarColor || '#06b6d4' }}
              >
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[90px] truncate">{user.username}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile / Tablet Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="xl:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Nav Drawer for < xl viewports */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#080F24] px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-left text-xs font-medium ${
                activeTab === item.id
                  ? 'bg-cyan-500/15 text-cyan-500'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-xs font-medium text-amber-400 hover:bg-white/5"
            >
              Admin Console
            </button>
          )}
        </div>
      )}
    </header>
  );
}
