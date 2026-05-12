import React, { useState } from 'react';
import { HelpCircle, X, Send, Loader2 } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import { useAuth } from '../../auth/context/AuthContext';

const CustomerReportModal = ({ isOpen, onClose, shopName, orderId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return toast.error("Please enter a message");

    let finalMessage = formData.message;
    if (orderId) finalMessage = `[Order: ${orderId}] ${finalMessage}`;
    if (shopName) finalMessage = `[Shop: ${shopName}] ${finalMessage}`;

    setLoading(true);
    try {
      const { data } = await api.post('/reports', {
        senderName: formData.name || 'Anonymous',
        email: formData.email,
        phone: formData.phone,
        message: finalMessage,
        userRole: user?.role || 'customer'
      });

      if (data.success) {
        toast.success("Support ticket submitted successfully.");
        setFormData(prev => ({ ...prev, message: '' }));
        onClose();
      } else {
        throw new Error(data.error || 'Failed to submit report');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg uppercase tracking-tight">Report an Issue</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{shopName || 'General Support'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
            {!user && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Your Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Required" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Contact Phone</label>
                  <input type="tel" maxLength="10" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="10-digit number (Optional)" />
                </div>
              </div>
            )}
            
            {(!user || !user.email) && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Required for replies" required />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2 mb-1">Description of Issue</label>
              <textarea rows="4" required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:border-rose-500 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" placeholder="Please describe what went wrong in detail..." />
            </div>
            {orderId && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 bg-gray-50 p-2 rounded-lg w-fit border border-gray-100">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Auto-attaching Order {orderId}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 mt-4">
          <button type="submit" form="report-form" disabled={loading} className="w-full h-14 bg-gray-900 border border-gray-800 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-all active:scale-95 disabled:bg-gray-300 disabled:border-transparent">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} {loading ? 'Submitting...' : 'Send to Support Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerReportModal;
