import React from 'react';
import { useToast } from '../../context/ToastContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border toast-enter transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
          {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />}
          
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
