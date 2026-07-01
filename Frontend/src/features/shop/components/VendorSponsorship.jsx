import React, { useState, useEffect } from 'react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import { Sparkles, Star, CalendarDays, Loader2, ArrowRight } from 'lucide-react';

export default function VendorSponsorship({ vendorShop }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [vendorShop]);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/sponsorship/status');
      setStatusData(data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to fetch sponsorship status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefundRequest = async (id) => {
    if (!window.confirm("Are you sure you want to request a refund? You will lose this slot and a deduction charge will apply.")) return;
    const toastId = toast.loading('Submitting refund request...');
    try {
      await api.post(`/sponsorship/${id}/refund-request`);
      toast.success('Refund request submitted successfully', { id: toastId });
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit refund request', { id: toastId });
    }
  };

  const handlePurchase = async () => {
    if (!statusData?.pinCode) {
      return toast.error("Please set your location/PIN code first.");
    }

    setProcessing(true);
    try {
      // 1. Get Platform Keys
      const keysRes = await api.get('/admin-payments/keys');
      const platformKeyId = keysRes.data.keyId;

      // 2. Create Order
      const { data: orderData } = await api.post('/admin-payments/create-order', {
        amount: 199,
        type: 'SPONSORSHIP'
      });

      // 3. Init Razorpay
      const options = {
        key: platformKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Top Spot Sponsorship',
        description: '7-Day Top Spot for ' + statusData.pinCode,
        order_id: orderData.order.id,
        handler: async (response) => {
          const verifyToast = toast.loading('Verifying payment...');
          try {
            await api.post('/admin-payments/verify-payment', {
              ...response,
              shopId: vendorShop._id,
              type: 'SPONSORSHIP'
            });
            toast.success('Sponsorship Confirmed!', { id: verifyToast });
            fetchStatus();
          } catch (verifyErr) {
            toast.error('Verification failed', { id: verifyToast });
          }
        },
        theme: { color: '#f59e0b' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  const { hasActiveOrUpcoming, mySponsorships, nextAvailableDate, isImmediate, pinCode, activeCount } = statusData || {};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
          <Star size={120} />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Top Spot Sponsorship</h3>
        <p className="text-white/90 text-[11px] font-bold uppercase tracking-widest max-w-[80%]">
          Secure one of only 4 priority slots in your area ({pinCode || 'No PIN'}). Get noticed instantly.
        </p>
      </div>

      {hasActiveOrUpcoming ? (
        <div className="bg-emerald-50 rounded-[24px] p-6 border border-emerald-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-2">
            <Sparkles size={32} />
          </div>
          <h4 className="text-lg font-black text-emerald-700 uppercase tracking-tight">You are Sponsored!</h4>
          <div className="space-y-2 w-full max-w-sm">
            {mySponsorships.map((s, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm text-left flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {s.status === 'REFUND_REQUESTED' ? 'Refund Pending' : (new Date(s.startDate) <= new Date() ? 'Active Slot' : 'Upcoming Pre-Booking')}
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(s.startDate).toLocaleDateString()} to {new Date(s.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-lg font-black text-[10px] ${s.status === 'REFUND_REQUESTED' ? 'text-orange-500 bg-orange-50' : 'text-emerald-500 bg-emerald-50'}`}>
                    SLOT {s.slotNumber}
                  </div>
                  {s.status === 'ACTIVE' && new Date(s.startDate) >= new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                    <button 
                      onClick={() => handleRefundRequest(s._id)}
                      className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 bg-rose-50 px-2 py-1 rounded-md"
                    >
                      Request Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest pt-2">
            You can book another slot after your current one expires.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Slots</p>
              <p className="text-3xl font-black text-orange-600 mt-1">4</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Now</p>
              <p className="text-3xl font-black text-gray-700 mt-1">{activeCount || 0}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays className="text-blue-500" size={20} />
              <h4 className="font-black text-gray-800 uppercase tracking-tight text-sm">Next Availability</h4>
            </div>
            <p className="text-xs font-bold text-gray-600">
              {isImmediate ? (
                <span className="text-emerald-600">Slots are available immediately! Your 7-day sponsorship will start as soon as you pay.</span>
              ) : (
                <div className="flex flex-col">
                  <span className="text-blue-600">All slots are currently full. If you make payment, you will go in queue and your 7-day sponsorship will automatically start on <b>{new Date(nextAvailableDate).toLocaleString()}</b>.</span>
                  <span className="text-rose-500 text-[9px] uppercase tracking-wider mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <b>Refund Policy:</b> If you want to get a refund, click "Request Refund" at least 1 day before the start date. ₹49 will be deducted and the remaining amount will be credited to you.
                  </span>
                </div>
              )}
            </p>
          </div>

          <button
            onClick={handlePurchase}
            disabled={processing}
            className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
              processing 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-orange-200 hover:-translate-y-0.5'
            }`}
          >
            {processing ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : (
              <>Pay ₹199 to {isImmediate ? 'Sponsor Now' : 'Pre-Book'} <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
