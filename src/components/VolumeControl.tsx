type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
};

export function VolumeControl({ value, onChange, disabled }: Props) {
  return (
    <div className="volume-control">
      <span className="volume-control__icon" aria-hidden>
        🔈
      </span>
      <input
        className="volume-control__range"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        aria-label="Master volume"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="volume-control__icon" aria-hidden>
        🔊
      </span>
    </div>
  );
}
