// frontend/src/admin/MediaPickerModal.jsx
import React from "react";
import MediaGrid from "./MediaGrid";

export default function MediaPickerModal({ open, onClose, token, onPicked }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white max-w-5xl w-full rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Choose a media item</h2>
          <button className="text-sm underline" onClick={onClose}>Close</button>
        </div>
        <MediaGrid
          token={token}
          selectable
          onSelect={(m) => {
            onPicked?.(m);  // returns { url, publicId, width, height, ... }
            onClose?.();
          }}
        />
      </div>
    </div>
  );
}
