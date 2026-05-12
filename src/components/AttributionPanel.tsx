import { useEffect, useState } from "react";

type Props = {
  onClose: () => void;
};

export function AttributionPanel({ onClose }: Props) {
  const [text, setText] = useState<string>("Loading…");

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    const url = `${base.endsWith("/") ? base : `${base}/`}ATTRIBUTION.md`;
    void (async () => {
      try {
        const res = await fetch(url);
        const body = await res.text();
        if (!cancelled) setText(body || "No attribution file found.");
      } catch {
        if (!cancelled) setText("Could not load ATTRIBUTION.md.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="attribution-overlay" role="dialog" aria-modal="true" aria-label="Attributions">
      <div className="attribution-overlay__backdrop" onClick={onClose} />
      <div className="attribution-overlay__panel">
        <header className="attribution-overlay__header">
          <h2>Attributions & licenses</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <pre className="attribution-overlay__body">{text}</pre>
      </div>
    </div>
  );
}
