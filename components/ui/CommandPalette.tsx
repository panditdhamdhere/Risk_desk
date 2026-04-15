"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Action = {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
};

type CommandPaletteProps = {
  actions: Action[];
};

export function CommandPalette({ actions }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!filtered.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (c + 1) % filtered.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (c - 1 + filtered.length) % filtered.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[cursor]?.onSelect();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, cursor]);

  return (
    <>
      <button className="theme-toggle" onClick={() => setOpen(true)} aria-label="Open command palette">
        ⌘K
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="cmd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="cmd-panel card clean-card"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                className="cmd-input"
                autoFocus
                placeholder="Search commands..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="cmd-list">
                {filtered.length ? (
                  filtered.map((a, idx) => (
                    <button
                      key={a.id}
                      className={`cmd-item ${idx === cursor ? "active" : ""}`}
                      onClick={() => {
                        a.onSelect();
                        setOpen(false);
                      }}
                    >
                      <span>{a.label}</span>
                      <span className="muted">{a.hint ?? ""}</span>
                    </button>
                  ))
                ) : (
                  <p className="muted cmd-empty">No matches</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
