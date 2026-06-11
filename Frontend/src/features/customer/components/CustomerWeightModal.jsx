import React, { useState, useEffect, useRef } from 'react';
import { X, ShoppingBag, Scale, Banknote, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const CustomerWeightModal = ({ isOpen, onClose, product, onConfirm, initialValue }) => {
  const [inputVal, setInputVal] = useState('');
  const [weightUnit, setWeightUnit] = useState('gm');
  const [entryMode, setEntryMode] = useState('weight'); // 'weight' or 'amount'
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setInputVal(initialValue >= 1 ? initialValue.toString() : (initialValue * 1000).toString());
        setWeightUnit(initialValue >= 1 ? 'kg' : 'gm');
      } else {
        setInputVal('');
        setWeightUnit('gm');
      }
      setEntryMode('weight');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);

  if (!isOpen || !product) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    const val = parseFloat(inputVal) || 0;
    if (val <= 0) return;

    let finalQty = 0;
    if (entryMode === 'amount') {
      finalQty = val / product.price;
    } else {
      finalQty = weightUnit === 'gm' ? val / 1000 : val;
    }

    const maxStock = Number(product.stockQuantity || product.stock || 0);
    const isWeight = product.sellingType === 'weight';
    const allowedQty = isWeight ? maxStock * 0.95 : maxStock;

    if (finalQty > allowedQty) {
      if (isWeight) {
        toast.error(`For weight-based items, you can buy up to 95% of stock (${parseFloat(allowedQty.toFixed(3))} KG) to account for wastage.`);
      } else {
        toast.error("No more packets available");
      }
      return;
    }

    onConfirm(product, finalQty);
    onClose();
  };

  const calculatedPrice = entryMode === 'weight' 
    ? (product.price * (weightUnit === 'gm' ? (parseFloat(inputVal) || 0) / 1000 : (parseFloat(inputVal) || 0)))
    : (parseFloat(inputVal) || 0);

  const calculatedWeight = entryMode === 'amount'
    ? ((parseFloat(inputVal) || 0) / product.price)
    : (weightUnit === 'gm' ? (parseFloat(inputVal) || 0) / 1000 : (parseFloat(inputVal) || 0));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Loose Item Selection</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{product.name}</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 italic">₹{product.price} per KG</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6 border border-slate-100">
          <button 
            type="button" onClick={() => { setEntryMode('weight'); setInputVal(''); }}
            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${entryMode === 'weight' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
          >
            <Scale size={14} /> By Weight
          </button>
          <button 
            type="button" onClick={() => { setEntryMode('amount'); setInputVal(''); }}
            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${entryMode === 'amount' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
          >
            <Banknote size={14} /> By Amount (₹)
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-6">
          <div className="relative">
            <div className="absolute -top-6 left-2">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                 {entryMode === 'weight' ? 'Enter' : 'Pay'}
               </span>
            </div>
            <input 
              ref={inputRef}
              type="number" min="0" step="any" required placeholder={entryMode === 'weight' ? "0" : "₹ 0"}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] py-8 px-8 text-5xl font-black text-slate-900 focus:border-sky-500 focus:ring-0 outline-none transition-all pr-24"
              value={inputVal} onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm(e);
                }
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              {entryMode === 'weight' ? (
                <>
                  <button 
                    type="button" onClick={() => setWeightUnit('kg')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${weightUnit === 'kg' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                  >KG</button>
                  <button 
                    type="button" onClick={() => setWeightUnit('gm')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${weightUnit === 'gm' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                  >GM</button>
                </>
              ) : (
                <div className="bg-sky-600 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-200">
                  Cash
                </div>
              )}
            </div>
          </div>

          <div className="bg-sky-50 p-6 rounded-[32px] border border-sky-100 flex flex-col items-center gap-1 shadow-inner">
             <span className="text-[10px] font-black text-sky-800 uppercase tracking-[0.2em] opacity-60">
               {entryMode === 'weight' ? 'Total Payable' : 'You will receive'}
             </span>
             <span className="text-3xl font-black text-sky-600 tracking-tighter">
               {entryMode === 'weight' ? `₹${calculatedPrice.toFixed(2)}` : `${calculatedWeight.toFixed(3)} KG`}
             </span>
          </div>

          <div className="flex gap-4">
            <button 
              type="button" onClick={onClose}
              className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
            >Cancel</button>
            <button 
              type="submit"
              className="flex-[2] bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerWeightModal;
