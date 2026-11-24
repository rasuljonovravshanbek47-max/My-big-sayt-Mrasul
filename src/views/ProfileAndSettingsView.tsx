import { useState } from 'react';
import { Lock, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { GameCard, TrackCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import { AGE_CATEGORIES, type AgeCategory, type GameItem, type MusicTrack } from '../types';

const AVATAR_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

export function ProfileView() {
  const { user, recentActivity, refreshUser, logout, setAuthModalOpen, setActiveTab } = useUniverse();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#06b6d4');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-8 rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-8 text-center">
        <UserIcon className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your Profile</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-5">
          Sign in or register to customize your avatar, track recently played games, and sync listening history.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username, avatarColor }),
      });
      await refreshUser();
      setMsg('Profile updated.');
    } catch (err: any) {
      setMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const recentGames = recentActivity
    .filter((a) => a.itemType === 'game' && a.itemSnapshot)
    .map((a) => a.itemSnapshot as GameItem);
  const recentTracks = recentActivity
    .filter((a) => a.itemType === 'music' && a.itemSnapshot)
    .map((a) => a.itemSnapshot as MusicTrack);

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-display font-bold text-slate-950 shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{user.username}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.email} · {user.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-rose-500/20 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Edit Profile */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 space-y-4 max-w-2xl"
      >
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Customize Profile</h2>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={2}
            maxLength={32}
            required
            className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Avatar Accent Color</label>
          <div className="flex items-center gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${avatarColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {msg && <span className="text-xs text-cyan-500">{msg}</span>}
        </div>
      </form>

      {/* Recently Played Games */}
      {recentGames.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Recently Played Games
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentGames.slice(0, 4).map((g) => (
              <GameCard key={`rg-${g.id}`} game={g} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Listened Tracks */}
      {recentTracks.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Recently Listened Tracks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentTracks.slice(0, 6).map((t) => (
              <TrackCard key={`rt-${t.id}`} track={t} queueContext={recentTracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SettingsView() {
  const {
    user,
    ageCategory,
    setAgeCategorySelection,
    theme,
    toggleTheme,
    reducedMotion,
    setReducedMotionPref,
    refreshUser,
  } = useUniverse();

  const [selectedAge, setSelectedAge] = useState<AgeCategory>(ageCategory || '12_14');
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleAgeSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setError('');
    try {
      await setAgeCategorySelection(selectedAge, pinInput || undefined);
      setPinInput('');
      setStatus('Age category updated.');
    } catch (err: any) {
      setError(err.message || 'Could not update age category.');
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setError('');
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ parentalPin: newPin, currentParentalPin: pinInput || undefined }),
      });
      await refreshUser();
      setNewPin('');
      setPinInput('');
      setStatus('Parental safeguard PIN saved.');
    } catch (err: any) {
      setError(err.message || 'Could not save PIN.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure appearance, accessibility motion preferences, and age-based content safeguards.
        </p>
      </div>

      {/* Appearance & Accessibility */}
      <section className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Appearance & Accessibility</h2>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-white/5">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Color Theme</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Currently using {theme === 'dark' ? 'Midnight Futuristic Dark' : 'Crisp Daylight'} mode.
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-900 dark:text-white"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Reduced Motion</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Minimizes 3D camera movement, card tilt, and UI transition animations.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReducedMotionPref(!reducedMotion)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold ${
              reducedMotion
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
            }`}
          >
            {reducedMotion ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </section>

      {/* Age Category Safeguard */}
      <section className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Age Category & Content Filter</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Age selection customizes your content filter and is not a legally verified identity check. Parental guidance is recommended for younger users.
        </p>

        <form onSubmit={handleAgeSave} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AGE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedAge(cat.id)}
                className={`p-3 rounded-xl border text-left text-xs ${
                  selectedAge === cat.id
                    ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-white font-semibold'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {user?.hasParentalPin && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Enter 4-digit Parental PIN to confirm age change
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="\d{4}"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="4-digit PIN"
                required
                className="w-48 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            Apply Age Category
          </button>
        </form>

        {user && (
          <form onSubmit={handleSetPin} className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Lock className="w-3.5 h-3.5 text-cyan-500" />
              {user.hasParentalPin ? 'Update Parental Safeguard PIN' : 'Set Optional 4-Digit Parental PIN'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                maxLength={4}
                pattern="\d{4}"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New 4-digit PIN"
                className="w-40 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-semibold text-slate-900 dark:text-white"
              >
                Save PIN
              </button>
            </div>
          </form>
        )}

        {status && <p className="text-xs text-emerald-500">{status}</p>}
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </section>
    </div>
  );
}
