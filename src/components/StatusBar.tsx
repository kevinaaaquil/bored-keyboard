type LoadState = "idle" | "loading" | "error";

type Props = {
  loadState: LoadState;
  instrumentName: string;
  errorMessage: string | null;
  onRetry: () => void;
};

export function StatusBar({ loadState, instrumentName, errorMessage, onRetry }: Props) {
  let message = "Press number keys 0–9 to play.";
  if (loadState === "loading") {
    message = `Loading ${instrumentName}…`;
  } else if (loadState === "error") {
    message = `Couldn't load ${instrumentName}. Try another or retry.`;
  }

  return (
    <div className="status-bar">
      <div className="status-bar__live" aria-live="polite">
        {loadState === "loading" ? <span className="status-bar__spinner" aria-hidden /> : null}
        <span className={loadState === "error" ? "status-bar__text status-bar__text--error" : "status-bar__text"}>
          {message}
        </span>
        {loadState === "error" && errorMessage ? (
          <span className="status-bar__detail"> {errorMessage}</span>
        ) : null}
      </div>
      {loadState === "error" ? (
        <button type="button" className="link-button status-bar__retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
