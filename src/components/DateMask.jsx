// The leaf of gold that sits over the one line of the card artwork printing the date, so the
// scratch heart on s3 still has something to reveal. It is rendered in three places — the card
// on s1, the full-screen reader, and the letter that rises out of the envelope on the intro —
// and carries the hint explaining why the line is covered.
//
// Sizing is relative to the card it sits on: each host sets `--cw` (the card's width) and every
// measurement here is a fraction of it, so the band and its writing hold their proportions at
// any width and through the intro letter's 1.85 scale-up.
export default function DateMask({ t, lang, off }) {
  return (
    <i className={"datemask" + (off ? " off" : "")} aria-hidden="true">
      <span className={"dm-t" + (lang === "sd" ? " sd-t" : "")}>{t.maskHint}</span>
    </i>
  );
}
