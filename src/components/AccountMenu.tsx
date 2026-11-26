"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteMyAccount, signOut, useAccount, useAutoSync } from "@/lib/account";

/** Top-nav account control; also runs background sync while signed in. */
export function AccountMenu() {
  const user = useAccount();
  useAutoSync(user);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (user === undefined) return <span className="w-16" />;
  if (!user)
    return (
      <Link href="/login" className="rounded-md bg-gold-500 px-3 py-1 text-sm font-semibold text-ink transition hover:bg-gold-400">
        Sign in
      </Link>
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="max-w-[160px] truncate rounded-md border border-graphite-700 px-2.5 py-1 text-sm text-graphite-300 hover:border-gold-500"
        title={user.email}
      >
        {user.email.split("@")[0]}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 space-y-2 rounded-xl border border-graphite-800 bg-paper p-4 text-sm shadow-xl">
          <p className="text-xs text-graphite-400">Signed in as</p>
          <p className="truncate text-graphite-100">{user.email}</p>
          <p className="text-xs text-graphite-400">Your progress saves to your account automatically.</p>
          <div className="space-y-1 border-t border-graphite-800 pt-2">
            <Link href="/start" onClick={() => setOpen(false)} className="block py-1 text-graphite-300 hover:text-gold-300">
              Update my plan
            </Link>
            <button type="button" onClick={() => void signOut().then(() => (window.location.href = "/"))} className="block py-1 text-graphite-300 hover:text-gold-300">
              Sign out
            </button>
            {confirmDelete ? (
              <div className="space-y-2 rounded-md border border-signal-red/50 p-2">
                <p className="text-xs text-graphite-300">Delete your account and all saved data? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void deleteMyAccount().then(() => (window.location.href = "/"))}
                    className="rounded-md border border-signal-red/60 px-2 py-1 text-xs text-signal-red"
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md border border-graphite-700 px-2 py-1 text-xs">
                    Keep
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="block py-1 text-xs text-graphite-400 hover:text-signal-red">
                Delete my account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
