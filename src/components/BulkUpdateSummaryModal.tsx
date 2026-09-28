import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SystemUpdateItem } from '../types';

interface BulkUpdateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  updates: SystemUpdateItem[];
}

export const BulkUpdateSummaryModal: React.FC<BulkUpdateSummaryModalProps> = ({ isOpen, onClose, updates }) => {
  if (!isOpen) return null;

  const successful = updates.filter(u => u.status === 'up_to_date');
  const failed = updates.filter(u => u.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Bulk Update Summary</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-5 h-5" /> <span>{successful.length} successfully updated</span></div>
          <div className="flex items-center gap-2 text-rose-400"><AlertCircle className="w-5 h-5" /> <span>{failed.length} failed components</span></div>
          {failed.length > 0 && (
            <div className="text-xs text-slate-400 mt-2 p-2 bg-slate-800 rounded">
              Rollback actions have been initiated for failed components.
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">Close</button>
      </div>
    </div>
  );
};
