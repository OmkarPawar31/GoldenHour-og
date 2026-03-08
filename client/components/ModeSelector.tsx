"use client";

interface ModeSelectorProps {
  mode: string;
  onModeChange: (mode: string) => void;
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const modes = ["ambulance", "private-emergency", "driver"];

  return (
    <div className="flex gap-2">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          className={`rounded-lg px-4 py-2 capitalize ${
            mode === m ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          {m.replace("-", " ")}
        </button>
      ))}
    </div>
  );
}
