'use client';

import { Check, Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { THEMES, ThemeId } from '@/app/providers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-[var(--bg-tertiary)]"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 text-[var(--text-secondary)]" />
          ) : theme === 'midnight' ? (
            <Moon className="h-4 w-4 text-[var(--accent-primary)]" />
          ) : theme === 'crimson' ? (
            <Palette className="h-4 w-4 text-red-500" />
          ) : (
            <Palette className="h-4 w-4 text-[var(--accent-primary)]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-[var(--border)] bg-[var(--bg-secondary)]"
      >
        <div className="px-2 py-1.5 text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
          Theme
        </div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex cursor-pointer items-center gap-3 py-2.5 hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)]"
          >
            {/* Color preview swatch */}
            <div className="flex -space-x-1">
              <div
                className="h-5 w-5 rounded-full border-2 border-[var(--bg-secondary)]"
                style={{ backgroundColor: t.preview[0] }}
              />
              <div
                className="h-5 w-5 rounded-full border-2 border-[var(--bg-secondary)]"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">{t.name}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{t.description}</div>
            </div>
            {theme === t.id && <Check className="h-4 w-4 text-[var(--accent-primary)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Larger theme picker for settings dialogs
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <div key={t.id} className="h-24 animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`relative rounded-xl border p-4 transition-all ${
            theme === t.id
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
              : 'border-[var(--border)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'
          }`}
        >
          {/* Theme preview */}
          <div
            className="mb-3 h-12 w-full overflow-hidden rounded-lg"
            style={{ backgroundColor: t.preview[0] }}
          >
            <div className="flex items-center gap-1.5 p-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.preview[1] }} />
              <div
                className="h-1.5 w-8 rounded-full opacity-50"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
            <div className="px-2">
              <div
                className="h-1 w-12 rounded-full opacity-30"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
          </div>

          {/* Theme name */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-left text-sm font-medium text-[var(--text-primary)]">
                {t.name}
              </div>
              <div className="text-left text-xs text-[var(--text-tertiary)]">{t.description}</div>
            </div>
            {theme === t.id && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
