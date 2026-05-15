import React, { useState } from 'react';
import { ShieldAlert, Trash2, X } from 'lucide-react';

const SafeDeleteModal = ({ isOpen, onClose, onConfirm, targetName, targetType }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (inputValue.trim().toLowerCase() !== targetName.trim().toLowerCase()) return;
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-red-100">
        
        <div className="p-8 bg-red-50 text-red-600 flex flex-col items-center text-center">
           <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert size={40} strokeWidth={2.5} />
           </div>
           <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Security Confirmation</h3>
           <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">DANGER: Permanent Deletion Action</p>
        </div>

        <div className="p-8">
           <p className="text-sm font-medium text-slate-600 mb-6">
              To delete the {targetType} <span className="font-black text-slate-900 underline">"{targetName}"</span> permanently, please type the exact name below:
           </p>

           <input 
             type="text" 
             autoFocus
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             placeholder={`Type "${targetName}" here...`}
             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:border-red-400 focus:bg-white outline-none transition-all mb-6 placeholder:text-slate-300 uppercase"
           />

           <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={inputValue.trim().toLowerCase() !== targetName.trim().toLowerCase() || isDeleting}
                onClick={handleConfirm}
                className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Deleting...' : <><Trash2 size={16} /> Confirm Deletion</>}
              </button>
           </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 text-center border-t border-slate-100">
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">This action cannot be undone. Data will be purged from ZenGalla Nodes.</p>
        </div>
      </div>
    </div>
  );
};

export default SafeDeleteModal;
