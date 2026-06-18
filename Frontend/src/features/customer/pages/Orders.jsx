import React from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronRight, Clock, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryParam } from '../../../hooks/useQueryParam';
import Logo from '../../common/components/Logo';

const CustomerOrders = () => {
  const { orders, deleteOrder, currentShopId, clearMyOrderHistory, setCurrentShopId, fetchCustomerOrders } = useStore();
  const navigate = useNavigate();

  // Show all customer orders (global view)
  const shopOrders = orders.filter(o => {
    // Only show orders, not in-store bills
    if (o.isBill || o.orderType === 'IN_STORE_BILL') return false;
    return true;
  });

  React.useEffect(() => {
    fetchCustomerOrders();
  }, [fetchCustomerOrders]);

  const [activeTab, setActiveTab] = useQueryParam('tab', 'ACTIVE');

  const activeOrders = shopOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'Cancelled');
  const completedOrders = shopOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'Cancelled');

  // Remove the block that prevents viewing all orders when no shop is selected

  const OrderItem = ({ order }) => {
    const isCancelled = order.status === 'CANCELLED' || order.status === 'Cancelled';
    const isCompleted = order.status === 'COMPLETED';
    
    let statusBadge = 'bg-blue-100 text-blue-700'; // NEW
    if (order.status === 'PACKING') statusBadge = 'bg-yellow-100 text-yellow-700';
    else if (isCompleted) statusBadge = 'bg-gray-200 text-gray-700';
    else if (isCancelled) statusBadge = 'bg-red-100 text-red-600';

    return (
      <div 
        onClick={() => navigate('/order-status', { state: { orderId: order.id || order._id } })}
        className={`bg-white rounded-2xl p-4 md:p-5 shadow-sm border transition-all cursor-pointer hover:border-brand-primary ${isCompleted || isCancelled ? 'border-gray-50 opacity-80' : 'border-gray-100'}`}
      >
        <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Order #{order.id || order._id}</h3>
            <p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()} • {order.items?.length} items</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-black text-brand-primary text-base leading-none block">₹{order.totalPrice}</span>
                {order.balanceDue > 0 && order.paymentStatus !== 'PAID' && (
                  <span className="text-[9px] font-black text-rose-500 uppercase mt-1 block">Due: ₹{order.balanceDue}</span>
                )}
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  toast.error("Delete this order record?", {
                    action: {
                      label: "Delete",
                      onClick: () => deleteOrder(order.id || order._id)
                    }
                  });
                }} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${statusBadge}`}>
              {order.status === 'NEW' ? 'Order Placed' : order.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg p-2">
           <div className="flex items-center gap-1.5 flex-1 w-0 truncate">
             {(!order.orderType || order.orderType === 'PICKUP' || order.orderType === 'Store Pickup') ? (
               <><Logo variant="icon" className="h-4 w-4 bg-transparent p-0" /> Store Pickup</>
             ) : (
               <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={14} className="text-gray-400 shrink-0"/> 
                    <span className="truncate">{order.deliveryAddress?.street || 'Home Delivery'}</span>
                  </div>
                  {order.deliveryDistance > 0 && (
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest pl-5">
                      {order.deliveryDistance.toFixed(2)} km distance
                    </span>
                  )}
                </div>
             )}
           </div>
           <div className="flex items-center gap-1.5 shrink-0 px-2 border-l border-gray-200">
             <Clock size={14} className="text-brand-yellow"/> {order.pickupTime}
           </div>
           <ChevronRight size={16} className="text-gray-300 ml-auto shrink-0"/>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">

      {/* Premium Dark Hero Header */}
      <div className="relative overflow-hidden shrink-0" style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative px-5 pt-8 pb-6 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] mb-1">My Account</p>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">My Orders</h1>
          </div>
          {shopOrders.length > 0 && (
            <button
              onClick={() => {
                toast.error("Clear order history?", {
                  action: {
                    label: "Delete",
                    onClick: () => clearMyOrderHistory()
                  }
                });
              }}
              className="text-[9px] font-black text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/20 px-4 py-2 rounded-full uppercase tracking-widest transition-all"
            >
              Clear History
            </button>
          )}
        </div>

        {/* Tab Switcher inside hero */}
        <div className="relative px-5 pb-5 flex gap-2">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-900/30'
                : 'bg-white/10 text-white/40 hover:bg-white/20'
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'PAST'
                ? 'bg-white/90 text-gray-900 shadow-lg'
                : 'bg-white/10 text-white/40 hover:bg-white/20'
            }`}
          >
            Past ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1400px] mx-auto">
          {shopOrders.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300">
                <Package size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                No order history
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                You haven't placed any orders on the platform yet.
              </p>
              <button 
                onClick={() => navigate('/shops')} 
                className="mt-4 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all active:scale-95 shadow-xl shadow-gray-100"
              >
                View Marketplace
              </button>
            </div>
          ) : activeTab === 'ACTIVE' ? (
            activeOrders.length > 0 ? (
              activeOrders.map(order => <OrderItem key={order.id || order._id} order={order} />)
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-3xl flex items-center justify-center text-sky-300">
                  <Package size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">No Active Orders</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">All quiet here! Browse a shop to place an order.</p>
                </div>
                <button onClick={() => navigate(`/shop/${currentShopId}`)} className="bg-sky-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-100 transition-all active:scale-95">
                  Browse Menu
                </button>
              </div>
            )
          ) : (
            completedOrders.length > 0 ? (
              completedOrders.map(order => <OrderItem key={order.id || order._id} order={order} />)
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300">
                  <Package size={32} strokeWidth={1.5} />
                </div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">No Past Orders</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};



export default CustomerOrders;
