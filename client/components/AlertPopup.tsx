"use client";

interface AlertPopupProps {
  message: string;
  onClose: () => void;
}

export default function AlertPopup({ message, onClose }: AlertPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-xl">
        <p className="text-lg">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
