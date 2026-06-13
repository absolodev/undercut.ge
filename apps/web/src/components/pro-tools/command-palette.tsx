"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-bg-surface border border-border-default rounded-lg shadow-2xl w-[500px]" onClick={(e) => e.stopPropagation()}>
        <Command className="rounded-lg bg-bg-surface">
          <Command.Input
            placeholder="Search stats, drivers, records..."
            className="w-full px-4 py-3 bg-transparent text-sm border-b border-border-default outline-none text-white focus:outline-none"
            autoFocus
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-4 text-center text-sm text-text-muted">No results found.</Command.Empty>

            <Command.Group heading={<span className="text-[10px] text-text-muted uppercase tracking-wider px-2">Navigation</span>}>
              <CommandItem label="Go to Standings" icon="📊" onSelect={() => { router.push("/f1/seasons"); setOpen(false); }} />
              <CommandItem label="Go to Drivers" icon="👤" onSelect={() => { router.push("/f1/drivers"); setOpen(false); }} />
              <CommandItem label="Go to Telemetry" icon="📈" onSelect={() => { router.push("/f1/compare"); setOpen(false); }} />
            </Command.Group>
            
             <Command.Group heading={<span className="text-[10px] text-text-muted uppercase tracking-wider px-2">Quick Actions</span>}>
              <CommandItem label="Toggle Pro Mode Tools" icon="🔧" onSelect={() => { /* Toggle pro mode */ setOpen(false); }} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({ label, icon, onSelect }: { label: string; icon: string, onSelect: () => void }) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex items-center gap-2 px-2 py-2 rounded text-sm cursor-pointer hover:bg-bg-elevated aria-selected:bg-bg-elevated text-white transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Command.Item>
  );
}
