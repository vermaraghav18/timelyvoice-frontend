// =============================================
// 6) src/components/common/ConfirmDialog.jsx
// (Small helper in case you want a nicer confirm later; unused by default)
// =============================================
export function ConfirmDialog({ open, title = "Confirm", message, onConfirm, onCancel }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-gray-100">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-[#1D9A8E] text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}

