'use client';

import { motion } from 'framer-motion';
import { Clock, Star, Archive } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'recent', label: 'Recent', icon: <Clock className="h-4 w-4" /> },
  { id: 'featured', label: 'Featured', icon: <Star className="h-4 w-4" /> },
  { id: 'archived', label: 'Archived', icon: <Archive className="h-4 w-4" /> },
];

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeTab]);

  return (
    <div className="relative flex items-center gap-1 rounded-xl bg-[var(--bg-tertiary)] p-1">
      {/* Animated indicator */}
      <motion.div
        className="absolute h-[calc(100%-8px)] rounded-lg bg-[var(--bg-surface)] shadow-md"
        initial={false}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ top: '4px' }}
      />

      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
          }}
          onClick={() => onTabChange(tab.id)}
          className={`relative z-10 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === tab.id
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          } `}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
