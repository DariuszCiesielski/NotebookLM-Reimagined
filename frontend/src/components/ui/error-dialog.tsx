'use client';

import { AlertCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
}

export function ErrorDialog({
  open,
  onClose,
  title = 'Error',
  message,
  details,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="border-red-500/30 bg-[#1a1a2e] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/20 p-2">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg text-white">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-300">{message}</p>
          {details && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-[rgba(0,0,0,0.3)] p-3">
              <p className="font-mono text-xs whitespace-pre-wrap text-gray-400">{details}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-red-500 text-white hover:bg-red-600 sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Success dialog variant
interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export function SuccessDialog({ open, onClose, title = 'Success', message }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="border-green-500/30 bg-[#1a1a2e] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500/20 p-2">
              <AlertCircle className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="text-lg text-white">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-300">{message}</p>
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-green-500 text-white hover:bg-green-600 sm:w-auto"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Confirmation dialog
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'bg-red-500/20',
      iconColor: 'text-red-500',
      button: 'bg-red-500 hover:bg-red-600',
      border: 'border-red-500/30',
    },
    warning: {
      icon: 'bg-yellow-500/20',
      iconColor: 'text-yellow-500',
      button: 'bg-yellow-500 hover:bg-yellow-600',
      border: 'border-yellow-500/30',
    },
    default: {
      icon: 'bg-[#7c3aed]/20',
      iconColor: 'text-[#7c3aed]',
      button: 'bg-[#7c3aed] hover:bg-[#6d28d9]',
      border: 'border-[#7c3aed]/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={`bg-[#1a1a2e] ${styles.border} sm:max-w-md`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${styles.icon}`}>
              <AlertCircle className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <DialogTitle className="text-lg text-white">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-300">{message}</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-[rgba(255,255,255,0.1)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)]"
          >
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className={`${styles.button} text-white`}>
            {loading ? 'Loading...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
