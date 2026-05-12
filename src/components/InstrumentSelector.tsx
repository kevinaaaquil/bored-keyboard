import type { Instrument } from "../data/instruments";

type Props = {
  instruments: Instrument[];
  activeId: string;
  disabled: boolean;
  onSelect: (id: string) => void | Promise<void>;
};

export function InstrumentSelector({ instruments, activeId, disabled, onSelect }: Props) {
  return (
    <div className="instrument-selector" role="tablist" aria-label="Instruments">
      {instruments.map((inst) => {
        const isActive = inst.id === activeId;
        return (
          <button
            key={inst.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`instrument-selector__pill ${isActive ? "instrument-selector__pill--active" : ""}`}
            disabled={disabled}
            onPointerDown={() => {
              if (disabled || inst.id === activeId) return;
              void onSelect(inst.id);
            }}
          >
            {inst.name}
          </button>
        );
      })}
    </div>
  );
}
