import { useEffect, useRef } from "react";

// The panel that rises from the bottom of the screen — the RSVP and the calendar chooser are both
// one of these. It owns the parts that are easy to get subtly wrong and pointless to write twice:
// the scroll lock, Escape, and keeping the tab ring inside the panel while it is open.
//
// It focuses the first control on mount and hands focus back to whatever opened it on the way out,
// so closing a sheet with a keyboard does not drop the reader at the top of the page. What it does
// not do is move focus as the panel's own contents change — a sheet with more than one screen owns
// that, because only it knows where the eye has gone.
export default function Sheet({ label, onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    const returnTo = document.activeElement;
    document.body.classList.add("lock");
    panel.current?.querySelector("button,textarea,input,[href]")?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const f = panel.current?.querySelectorAll("button,textarea,input,[href]");
      if (!f?.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.body.classList.remove("lock");
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [onClose]);

  return (
    <div className="rsvp-veil" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rsvp-sheet" ref={panel} role="dialog" aria-modal="true" aria-label={label}>
        <i className="ajrak" />
        <div className="rsvp-in">{children}</div>
      </div>
    </div>
  );
}
