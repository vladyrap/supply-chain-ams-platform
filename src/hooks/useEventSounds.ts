"use client";

import { useEffect, useRef, useState } from "react";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";
import { SOUND_BY_KIND, isMuted, setMuted, initAudio } from "@/lib/sounds";
import { usePlatform } from "@/context/PlatformContext";

const POLL_MS = 4000;

export function useEventSounds(opts: { enabled?: boolean } = {}) {
  const { soundsEnabled } = usePlatform();
  const [muted, setLocalMuted] = useState(false);
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const firstRef = useRef(true);

  useEffect(() => {
    setLocalMuted(isMuted());
    initAudio();
  }, []);

  // Sincronizar la preferencia global con el mute interno.
  // Cuando soundsEnabled=false en Platform, forzamos mute.
  useEffect(() => {
    if (!soundsEnabled) {
      setMuted(true);
      setLocalMuted(true);
    }
  }, [soundsEnabled]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setLocalMuted(next);
  }

  useEffect(() => {
    if (opts.enabled === false) return;
    let alive = true;
    async function tick() {
      const r = await fetchNotifications();
      if (!alive || !r.ok) return;
      setFeed(r.items.slice(0, 12));
      for (const it of r.items) {
        if (!seen.current.has(it.id)) {
          seen.current.add(it.id);
          if (!firstRef.current && !muted && soundsEnabled) {
            const fn = SOUND_BY_KIND[it.kind];
            if (fn) fn();
          }
        }
      }
      firstRef.current = false;
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [opts.enabled, muted, soundsEnabled]);

  return { muted, toggleMute, feed };
}
