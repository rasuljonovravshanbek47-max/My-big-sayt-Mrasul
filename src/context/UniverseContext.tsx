import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch, setAuthToken } from '../lib/api';
import type {
  ActivityEntry,
  AgeCategory,
  FavoriteEntry,
  GameItem,
  MusicTrack,
  NotificationItem,
  Playlist,
  UserProfile,
} from '../types';

export type NavTab =
  | 'home'
  | 'games'
  | 'music'
  | 'discover'
  | 'favorites'
  | 'playlists'
  | 'profile'
  | 'settings'
  | 'search'
  | 'admin';

interface UniverseContextValue {
  user: UserProfile | null;
  authLoading: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  ageCategory: AgeCategory | null;
  setAgeCategorySelection: (age: AgeCategory, pin?: string) => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  reducedMotion: boolean;
  setReducedMotionPref: (val: boolean) => void;
  // Auth
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Library
  favorites: FavoriteEntry[];
  playlists: Playlist[];
  recentActivity: ActivityEntry[];
  notifications: NotificationItem[];
  isFavorited: (itemType: 'game' | 'music', itemId: string) => boolean;
  toggleFavorite: (itemType: 'game' | 'music', itemId: string, snapshot?: GameItem | MusicTrack) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: MusicTrack) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  recordGamePlay: (game: GameItem) => Promise<void>;
  // Active Game Modal
  activeGame: GameItem | null;
  launchGame: (game: GameItem) => void;
  closeGame: () => void;
  // Persistent Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Persistent Music Player
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isFullScreenPlayer: boolean;
  showQueueDrawer: boolean;
  audioError: string | null;
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (sec: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setFullScreenPlayer: (open: boolean) => void;
  setShowQueueDrawer: (open: boolean) => void;
  addToQueue: (track: MusicTrack) => void;
  removeFromQueue: (trackId: string) => void;
}

const UniverseContext = createContext<UniverseContextValue | null>(null);

const GUEST_AGE_KEY = 'mrasul_guest_age';
const GUEST_THEME_KEY = 'mrasul_theme';
const GUEST_FAVS_KEY = 'mrasul_guest_favs';

export function UniverseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [ageCategory, setAgeCategory] = useState<AgeCategory | null>(() => {
    try {
      return (localStorage.getItem(GUEST_AGE_KEY) as AgeCategory) || null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem(GUEST_THEME_KEY) as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_FAVS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Persistent Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [isFullScreenPlayer, setFullScreenPlayer] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(GUEST_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.classList.add('reduce-motion');
    else root.classList.remove('reduce-motion');
  }, [reducedMotion]);

  const loadLibrary = useCallback(async (signedInUser: UserProfile | null) => {
    if (!signedInUser) {
      try {
        const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
        setNotifications(res.notifications || []);
      } catch {
        // ignore
      }
      setPlaylists([]);
      setRecentActivity([]);
      return;
    }

    try {
      const lib = await apiFetch<{
        favorites: FavoriteEntry[];
        playlists: Playlist[];
        recentActivity: ActivityEntry[];
        notifications: NotificationItem[];
      }>('/api/user/library');
      setFavorites(lib.favorites || []);
      setPlaylists(lib.playlists || []);
      setRecentActivity(lib.recentActivity || []);
      setNotifications(lib.notifications || []);
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
      setUser(res.user);
      if (res.user) {
        if (res.user.ageCategory) setAgeCategory(res.user.ageCategory);
        setTheme(res.user.theme || 'dark');
        setReducedMotion(res.user.reducedMotion);
      }
      await loadLibrary(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [loadLibrary]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (user) {
      try {
        await apiFetch('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ theme: next }),
        });
      } catch {
        // ignore
      }
    }
  }, [theme, user]);

  const setReducedMotionPref = useCallback(
    async (val: boolean) => {
      setReducedMotion(val);
      if (user) {
        try {
          await apiFetch('/api/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify({ reducedMotion: val }),
          });
        } catch {
          // ignore
        }
      }
    },
    [user]
  );

  const setAgeCategorySelection = useCallback(
    async (age: AgeCategory, pin?: string) => {
      if (user) {
        const res = await apiFetch<{ user: UserProfile }>('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ ageCategory: age, currentParentalPin: pin }),
        });
        setUser(res.user);
      }
      setAgeCategory(age);
      try {
        localStorage.setItem(GUEST_AGE_KEY, age);
      } catch {
        // ignore
      }
    },
    [user]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      setUser(res.user);
      if (res.user.ageCategory) setAgeCategory(res.user.ageCategory);
      setTheme(res.user.theme || 'dark');
      setReducedMotion(res.user.reducedMotion);
      await loadLibrary(res.user);
      setAuthModalOpen(false);
    },
    [loadLibrary]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, ageCategory }),
      });
      setAuthToken(res.token);
      setUser(res.user);
      await loadLibrary(res.user);
      setAuthModalOpen(false);
    },
    [ageCategory, loadLibrary]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
    setPlaylists([]);
    setRecentActivity([]);
    if (activeTab === 'admin') setActiveTab('home');
  }, [activeTab]);

  const isFavorited = useCallback(
    (itemType: 'game' | 'music', itemId: string) => {
      return favorites.some((f) => f.itemType === itemType && f.itemId === itemId);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (itemType: 'game' | 'music', itemId: string, snapshot?: GameItem | MusicTrack) => {
      if (user) {
        const res = await apiFetch<{ favorited: boolean }>('/api/favorites/toggle', {
          method: 'POST',
          body: JSON.stringify({ itemType, itemId, itemSnapshot: snapshot }),
        });
        if (res.favorited) {
          setFavorites((prev) => [
            { id: `fav-${Date.now()}`, itemType, itemId, itemSnapshot: snapshot, createdAt: new Date().toISOString() },
            ...prev,
          ]);
        } else {
          setFavorites((prev) => prev.filter((f) => !(f.itemType === itemType && f.itemId === itemId)));
        }
      } else {
        setFavorites((prev) => {
          const exists = prev.some((f) => f.itemType === itemType && f.itemId === itemId);
          const next = exists
            ? prev.filter((f) => !(f.itemType === itemType && f.itemId === itemId))
            : [
                { id: `fav-${Date.now()}`, itemType, itemId, itemSnapshot: snapshot, createdAt: new Date().toISOString() },
                ...prev,
              ];
          try {
            localStorage.setItem(GUEST_FAVS_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    },
    [user]
  );

  const createPlaylist = useCallback(
    async (name: string, description = '') => {
      if (!user) {
        setAuthModalOpen(true);
        return;
      }
      const res = await apiFetch<{ playlist: Playlist }>('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setPlaylists((prev) => [res.playlist, ...prev]);
    },
    [user]
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      if (!user) return;
      await apiFetch(`/api/playlists/${id}`, { method: 'DELETE' });
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    },
    [user]
  );

  const addTrackToPlaylist = useCallback(
    async (playlistId: string, track: MusicTrack) => {
      if (!user) {
        setAuthModalOpen(true);
        return;
      }
      await apiFetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track }),
      });
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.tracks.some((t) => t.id === track.id)) return pl;
          return { ...pl, tracks: [...pl.tracks, track] };
        })
      );
    },
    [user]
  );

  const removeTrackFromPlaylist = useCallback(
    async (playlistId: string, trackId: string) => {
      if (!user) return;
      await apiFetch(`/api/playlists/${playlistId}/tracks/${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
      });
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) } : pl
        )
      );
    },
    [user]
  );

  const markNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (user) {
      try {
        await apiFetch('/api/notifications/read', { method: 'POST' });
      } catch {
        // ignore
      }
    }
  }, [user]);

  const recordGamePlay = useCallback(
    async (game: GameItem) => {
      try {
        await apiFetch(`/api/games/${encodeURIComponent(game.id)}/play`, { method: 'POST' });
        if (user) {
          setRecentActivity((prev) => [
            {
              id: `act-${Date.now()}`,
              itemType: 'game',
              itemId: game.id,
              itemSnapshot: game,
              playedAt: new Date().toISOString(),
            },
            ...prev.filter((a) => !(a.itemType === 'game' && a.itemId === game.id)),
          ]);
        }
      } catch {
        // ignore
      }
    },
    [user]
  );

  const launchGame = useCallback(
    (game: GameItem) => {
      setActiveGame(game);
      recordGamePlay(game);
    },
    [recordGamePlay]
  );

  const closeGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  // ========================
  // AUDIO ENGINE (SINGLE PERSISTENT ELEMENT)
  // ========================
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => {
      setIsPlaying(true);
      setAudioError(null);
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setAudioError('Audio stream unavailable from this provider node. Try another track or open the official link.');
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const playTrack = useCallback(
    (track: MusicTrack, newQueue?: MusicTrack[]) => {
      setAudioError(null);
      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
      } else if (!queue.some((q) => q.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }

      setCurrentTrack(track);

      // Log play to backend
      apiFetch('/api/music/play', {
        method: 'POST',
        body: JSON.stringify({ track }),
      }).catch(() => {});

      if (user) {
        setRecentActivity((prev) => [
          {
            id: `act-${Date.now()}`,
            itemType: 'music',
            itemId: track.id,
            itemSnapshot: track,
            playedAt: new Date().toISOString(),
          },
          ...prev.filter((a) => !(a.itemType === 'music' && a.itemId === track.id)),
        ]);
      }

      const audio = audioRef.current;
      if (!audio) return;

      if (track.playbackType === 'youtube_embed') {
        audio.pause();
        audio.src = '';
        setCurrentTime(0);
        setDuration(track.durationSec || 210);
        setIsPlaying(true);
        setFullScreenPlayer(true);
        return;
      }

      if (!track.streamUrl) {
        audio.pause();
        audio.src = '';
        setIsPlaying(false);
        setAudioError('Direct stream unavailable. Use the official provider link to listen in full.');
        return;
      }

      audio.src = track.streamUrl;
      audio.currentTime = 0;
      setDuration(track.durationSec || 0);
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setAudioError('Playback blocked or stream unreachable. Click play or open official link.');
        });
    },
    [queue, user]
  );

  const nextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (repeat === 'one') {
      playTrack(currentTrack);
      return;
    }
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    if (shuffle && queue.length > 1) {
      let randIdx = Math.floor(Math.random() * queue.length);
      if (randIdx === idx) randIdx = (idx + 1) % queue.length;
      playTrack(queue[randIdx]);
      return;
    }
    const nextIdx = idx + 1;
    if (nextIdx < queue.length) {
      playTrack(queue[nextIdx]);
    } else if (repeat === 'all') {
      playTrack(queue[0]);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, playTrack, queue, repeat, shuffle]);

  const prevTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 4) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = idx > 0 ? idx - 1 : queue.length - 1;
    playTrack(queue[prevIdx]);
  }, [currentTrack, playTrack, queue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => nextTrack();
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [nextTrack]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (currentTrack.playbackType === 'youtube_embed') {
      setIsPlaying((p) => !p);
      return;
    }
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const seekTo = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(sec)) return;
    audio.currentTime = sec;
    setCurrentTime(sec);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  return (
    <UniverseContext.Provider
      value={{
        user,
        authLoading,
        activeTab,
        setActiveTab,
        ageCategory,
        setAgeCategorySelection,
        theme,
        toggleTheme,
        reducedMotion,
        setReducedMotionPref,
        authModalOpen,
        setAuthModalOpen,
        login,
        register,
        logout,
        refreshUser,
        favorites,
        playlists,
        recentActivity,
        notifications,
        isFavorited,
        toggleFavorite,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        markNotificationsRead,
        recordGamePlay,
        activeGame,
        launchGame,
        closeGame,
        searchQuery,
        setSearchQuery,
        currentTrack,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffle,
        repeat,
        isFullScreenPlayer,
        showQueueDrawer,
        audioError,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        setFullScreenPlayer,
        setShowQueueDrawer,
        addToQueue,
        removeFromQueue,
      }}
    >
      {children}
    </UniverseContext.Provider>
  );
}

export function useUniverse() {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used inside UniverseProvider');
  return ctx;
}
