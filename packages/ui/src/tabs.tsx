"use client";

import { type ReactNode, useState } from "react";
import { cn } from "./utils";

export type TabItem = {
  content: ReactNode;
  id: string;
  label: string;
};

export type TabsProps = {
  className?: string;
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  tabs: TabItem[];
};

export function Tabs({ className, defaultTab, onTabChange, tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  function handleTabClick(tabId: string) {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  }

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors duration-[var(--transition-fast)]",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleTabClick(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-5" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}
