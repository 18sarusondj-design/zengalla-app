import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { Banknote, Loader2, CheckCircle } from 'lucide-react';
import api from '../../../config/api.js';

const VendorPlatformDues = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchLedger = async () => {
    try {
      const res = await api.get('/ledger/unsettled');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [token]);

  const handleSettleDues = async () => {
    if (!data || data.summary.finalAmountToPay <= 0) return;
    
    let toastId;
    try {
      setIsProcessingPayment(true);
      toastId = toast.loading('Initializing secure payment gateway...');
      
      // 1. Get Super Admin Public Key
      const keyRes = await api.get('/admin-payments/keys');
      if (!keyRes.data.success) throw new Error('Payment gateway not configured');
      
      // 2. Create Order
      const orderRes = await api.post('/ledger/create-settlement-order', {
        amount: data.summary.finalAmountToPay
      });
      
      if (!orderRes.data.success) throw new Error('Order creation failed');
      
      toast.dismiss(toastId);
      
      const options = {
        key: keyRes.data.keyId,
        amount: orderRes.data.order.amount,
        currency: orderRes.data.order.currency,
        name: 'Grozy Platform',
        description: 'Platform Fees Settlement',
        order_id: orderRes.data.order.id,
        handler: async function (response) {
          const verifyToastId = toast.loading('Verifying your payment...');
          try {
            const verifyRes = await api.post('/ledger/verify-settlement', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: data.summary.finalAmountToPay,
              orderIds: data.unsettledOrders.map(o => o._id)
            });
            
            if (verifyRes.data.success) {
              toast.success('Dues Settled Successfully!', { id: verifyToastId });
              fetchLedger();
            } else {
              throw new Error(verifyRes.data.error || 'Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error(err.message || 'Payment verification failed', { id: verifyToastId });
          }
        },
        prefill: {
          name: 'Vendor',
        },
        theme: {
          color: '#0ea5e9'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center">
            <Banknote size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Platform Dues</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unsettled Platform & Delivery Fees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary Box */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Total Platform Fees</span>
                <span className="font-black text-slate-900">₹{data.summary.totalPlatformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Total Delivery Fees</span>
                <span className="font-black text-slate-900">₹{data.summary.totalDeliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-4">
                <span className="text-slate-700 font-black uppercase tracking-wider">Total Owed</span>
                <span className="font-black text-slate-900">₹{data.summary.totalOwed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-rose-500">
                <span className="font-bold uppercase tracking-wider">Razorpay Deduction (2%)</span>
                <span className="font-black">- ₹{data.summary.razorpayDeduction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg border-t border-slate-200 pt-4">
                <span className="text-sky-600 font-black uppercase tracking-wider">Final Amount</span>
                <span className="font-black text-sky-600 text-2xl">₹{data.summary.finalAmountToPay.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSettleDues}
              disabled={isProcessingPayment || data.summary.finalAmountToPay <= 0}
              className={`mt-8 w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                data.summary.finalAmountToPay > 0 
                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-200 hover:shadow-xl hover:-translate-y-1'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessingPayment ? (
                <Loader2 size={20} className="animate-spin" />
              ) : data.summary.finalAmountToPay > 0 ? (
                <>
                  <Banknote size={20} />
                  Pay ₹{data.summary.finalAmountToPay.toFixed(2)}
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  All Dues Settled
                </>
              )}
            </button>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Unsettled Orders</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {data.unsettledOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-2">
                  <CheckCircle size={32} />
                  <p className="font-black text-xs uppercase tracking-widest">No Unsettled Orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.unsettledOrders.map(order => (
                    <div key={order._id} className="p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center hover:border-sky-200 transition-colors">
                      <div>
                        <p className="font-black text-slate-900 text-sm">{order.orderNumber}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(order.createdAt).toLocaleDateString()} • {order.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sky-600 text-sm">₹{order.total.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          (Platform: ₹{order.platformFee} + Del: ₹{order.deliveryFee})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPlatformDues;
