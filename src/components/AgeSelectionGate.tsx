import { useState } from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { useUniverse } from '../context/UniverseContext';
import { AGE_CATEGORIES, type AgeCategory } from '../types';

export function AgeSelectionGate({ onSelected }: { onSelected?: () => void }) {
  const { setAgeCategorySelection } = useUniverse();
  const [selected, setSelected] = useState<AgeCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setAgeCategorySelection(selected);
      onSelected?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Select Your Age Category
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Before entering the Games Universe, choose your age group so we can tailor game recommendations and content ratings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {AGE_CATEGORIES.map((cat) => {
          const active = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelected(cat.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                active
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080E20] hover:border-cyan-500/40'
              }`}
            >
              <div className="font-display text-base font-bold text-slate-900 dark:text-white">{cat.label}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{cat.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Age selection configures your local content filter and is not a legally verified identity check. Parental guidance is recommended for users under 12. You can update this in Settings.
          </span>
        </div>

        <button
          type="button"
          disabled={!selected || saving}
          onClick={handleConfirm}
          className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold text-sm whitespace-nowrap shrink-0 transition-colors"
        >
          {saving ? 'Applying Filter...' : 'Enter Games Universe'}
        </button>
      </div>
    </div>
  );
}
