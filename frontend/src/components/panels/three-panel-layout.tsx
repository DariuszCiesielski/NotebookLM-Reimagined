'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelTitle?: string;
  rightPanelTitle?: string;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  maxLeftWidth?: number;
  maxRightWidth?: number;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelTitle = 'Sources',
  rightPanelTitle = 'Studio',
  defaultLeftWidth = 320,
  defaultRightWidth = 340,
  minLeftWidth = 240,
  minRightWidth = 280,
  maxLeftWidth = 500,
  maxRightWidth = 480,
}: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      if (isResizingLeft) {
        const newWidth = e.clientX - containerRect.left;
        if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
          setLeftWidth(newWidth);
        }
      }

      if (isResizingRight) {
        const newWidth = containerRect.right - e.clientX;
        if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
          setRightWidth(newWidth);
        }
      }
    },
    [isResizingLeft, isResizingRight, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <AnimatePresence initial={false}>
        {leftCollapsed ? (
          <motion.div
            initial={{ width: leftWidth }}
            animate={{ width: 48 }}
            exit={{ width: leftWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col items-center border-r border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: leftWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col border-r border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
            style={{ minWidth: minLeftWidth }}
          >
            {/* Panel Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-4">
              <h2 className="font-semibold text-[var(--text-primary)]">{leftPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <PanelLeftOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-x-visible overflow-y-auto">{leftPanel}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Resize Handle */}
      {!leftCollapsed && (
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--accent-primary)]/50"
          onMouseDown={() => setIsResizingLeft(true)}
        />
      )}

      {/* Center Panel */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
        {centerPanel}
      </div>

      {/* Right Resize Handle */}
      {!rightCollapsed && (
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--accent-primary)]/50"
          onMouseDown={() => setIsResizingRight(true)}
        />
      )}

      {/* Right Panel */}
      <AnimatePresence initial={false}>
        {rightCollapsed ? (
          <motion.div
            initial={{ width: rightWidth }}
            animate={{ width: 48 }}
            exit={{ width: rightWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col items-center border-l border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: rightWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col border-l border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
            style={{ minWidth: minRightWidth }}
          >
            {/* Panel Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-4">
              <h2 className="font-semibold text-[var(--text-primary)]">{rightPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <PanelRightOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">{rightPanel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
