'use client';

import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Search, Settings, Bell, User, LogOut, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ThemeSelector } from '@/components/ui/theme-selector';
import { createClient } from '@/lib/supabase';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface DashboardHeaderProps {
  user: SupabaseUser | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
}

export function DashboardHeader({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app';
        const response = await fetch(`${apiUrl}/api/v1/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }

    loadProfile();
  }, [user]);

  // Use profile display_name if available, otherwise fall back to email
  const displayName = profile?.display_name || user?.email || 'User';

  // Generate initials from display name (supports first+last name)
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)] p-0.5 shadow-[var(--accent-primary)]/20 shadow-lg">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] bg-[var(--bg-primary)]">
            {/* Neural network lines */}
            <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 40 40">
              <circle
                cx="12"
                cy="12"
                r="2"
                fill="currentColor"
                className="text-[var(--accent-primary)]"
              />
              <circle
                cx="28"
                cy="12"
                r="2"
                fill="currentColor"
                className="text-[var(--accent-secondary)]"
              />
              <circle
                cx="20"
                cy="28"
                r="2"
                fill="currentColor"
                className="text-[var(--accent-tertiary)]"
              />
              <line
                x1="12"
                y1="12"
                x2="28"
                y2="12"
                stroke="currentColor"
                strokeWidth="1"
                className="text-[var(--accent-primary)]"
              />
              <line
                x1="12"
                y1="12"
                x2="20"
                y2="28"
                stroke="currentColor"
                strokeWidth="1"
                className="text-[var(--accent-secondary)]"
              />
              <line
                x1="28"
                y1="12"
                x2="20"
                y2="28"
                stroke="currentColor"
                strokeWidth="1"
                className="text-[var(--accent-tertiary)]"
              />
            </svg>
            {/* Main icon - stylized notebook with sparkle */}
            <svg className="relative z-10 h-6 w-6" viewBox="0 0 24 24" fill="none">
              {/* Notebook body */}
              <rect
                x="5"
                y="3"
                width="14"
                height="18"
                rx="2"
                className="stroke-[var(--accent-primary)]"
                strokeWidth="1.5"
                fill="none"
              />
              {/* Notebook lines */}
              <line
                x1="8"
                y1="8"
                x2="16"
                y2="8"
                className="stroke-[var(--accent-secondary)]"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="8"
                y1="12"
                x2="14"
                y2="12"
                className="stroke-[var(--accent-secondary)]"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* AI sparkle */}
              <path
                d="M18 2l.5 1.5L20 4l-1.5.5L18 6l-.5-1.5L16 4l1.5-.5L18 2z"
                className="fill-[var(--accent-tertiary)]"
              />
              <path
                d="M20 15l.35 1L21.5 16.35l-1.15.35L20 17.85l-.35-1.15L18.5 16.35l1.15-.35L20 15z"
                className="fill-[var(--accent-primary)]"
              />
            </svg>
          </div>
        </div>
        <span className="hidden text-lg font-semibold text-[var(--text-primary)] sm:inline">
          NotebookLM Reimagined
        </span>
      </div>

      {/* Search */}
      <div className="mx-8 hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search notebooks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 rounded-xl border-[var(--border)] bg-[var(--bg-tertiary)] pl-10 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Selector */}
        <ThemeSelector />

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() => router.push('/settings')}
          title="Settings & API Keys"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 rounded-xl px-2 hover:bg-[var(--bg-tertiary)]"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
                <AvatarFallback className="bg-[var(--accent-primary)] text-sm text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm text-[var(--text-secondary)] lg:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-[var(--border)] bg-[var(--bg-secondary)]"
          >
            <div className="px-2 py-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Free Plan</p>
            </div>
            <DropdownMenuSeparator className="bg-[var(--border)]" />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--border)]" />
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
