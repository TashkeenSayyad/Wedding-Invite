import { useCallback, useEffect, useRef, useState } from "react";

// The song that plays once the envelope is opened.
//
// Browsers only let a page make sound from inside a tap, so start() has to be called straight from
// the seal's click handler — before any timeout — or Safari refuses it. Nothing plays by itself
// before that tap, and the guest can silence it from the top bar at any time.
//
// The audio element is created on the first tap, not on load: a guest who never opens the
// envelope never downloads the song. If the file is missing, play() rejects and the page carries
// on silently; `ready` only turns true once sound is actually coming out, so the mute control
// never appears for music that does not exist.
export function useMusic(src) {
  const el = useRef(null);
  const wanted = useRef(false);        // the guest's choice, as opposed to "paused because hidden"
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);

  const fadeIn = (a) => {
    // iOS ignores volume (it is read-only there), so this is a nicety elsewhere and harmless there.
    // How loud the music is, is set in the file itself (music.mp3 is mastered quiet, about
    // -29.5 LUFS), not here — otherwise iPhones, which always play at full volume, would be louder
    // than everything else. The fade therefore ends at 1.
    a.volume = 0;
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(1, v + 0.07);
      try { a.volume = v; } catch {}
      if (v >= 1) clearInterval(id);
    }, 120);
  };

  const play = useCallback(() => {
    const a = el.current;
    if (!a) return;
    wanted.current = true;
    const p = a.play();
    if (p && p.catch) p.catch(() => { wanted.current = false; setOn(false); });
    fadeIn(a);
  }, []);

  const start = useCallback(() => {
    if (!src || el.current) return;
    const a = new Audio(src);
    a.loop = true;
    a.preload = "auto";
    a.addEventListener("playing", () => { setReady(true); setOn(true); });
    a.addEventListener("pause", () => setOn(false));
    a.addEventListener("error", () => { wanted.current = false; setOn(false); });
    el.current = a;
    play();
  }, [src, play]);

  const toggle = useCallback(() => {
    const a = el.current;
    if (!a) return;
    if (a.paused) play();
    else { wanted.current = false; a.pause(); }
  }, [play]);

  // Leaving for WhatsApp, locking the phone, switching tabs: the music stops with the page and
  // comes back with it, unless the guest had turned it off.
  useEffect(() => {
    const onVis = () => {
      const a = el.current;
      if (!a) return;
      if (document.hidden) a.pause();
      else if (wanted.current) a.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      el.current?.pause();
    };
  }, []);

  return { start, toggle, ready, on };
}
