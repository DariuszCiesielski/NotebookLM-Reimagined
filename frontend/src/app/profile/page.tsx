'use client';

import { User, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ErrorDialog, SuccessDialog } from '@/components/ui/error-dialog';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase';


interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  created_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');

  // Dialog state
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    open: false,
    title: '',
    message: '',
  });
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const showError = (title: string, message: string, details?: string) => {
    setErrorDialog({ open: true, title, message, details });
  };

  const showSuccess = (title: string, message: string) => {
    setSuccessDialog({ open: true, title, message });
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app';

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`${apiUrl}/api/v1/profile`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setDisplayName(data.display_name || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      showError('Load Failed', 'Failed to load your profile. Please try again.', String(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      showError('Validation Error', 'Display name cannot be empty. Please enter a name.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`${apiUrl}/api/v1/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        showSuccess('Profile Updated', 'Your profile has been updated successfully.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showError(
          'Update Failed',
          'Failed to update your profile.',
          errorData.detail || `Status: ${response.status}`
        );
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      showError('Update Failed', 'An error occurred while saving your profile.', String(error));
    } finally {
      setSaving(false);
    }
  }

  const initials = (profile?.display_name || profile?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--accent-primary)]/20 p-2">
              <User className="h-5 w-5 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
          <h2 className="mb-6 text-lg font-medium text-[var(--text-primary)]">Profile Settings</h2>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-[var(--accent-primary)] text-2xl text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Avatar</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Avatar is generated from your display name initials
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Display Name
              </label>
              <div className="flex gap-3">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="max-w-md border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                />
                <Button
                  onClick={saveProfile}
                  disabled={saving || displayName === profile?.display_name}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
              <p className="text-[var(--text-primary)]">{profile?.email}</p>
            </div>

            {/* Member since */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Member since
              </label>
              <p className="text-[var(--text-primary)]">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
      />

      {/* Success Dialog */}
      <SuccessDialog
        open={successDialog.open}
        onClose={() => setSuccessDialog({ ...successDialog, open: false })}
        title={successDialog.title}
        message={successDialog.message}
      />
    </div>
  );
}
