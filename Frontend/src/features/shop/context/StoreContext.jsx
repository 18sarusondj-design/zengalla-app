import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const { user, token } = useAuth();

  // -- State --
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorShop, setVendorShop] = useState(null);
  const [currentShopId, setCurrentShopId] = useState(() => localStorage.getItem('currentShopId'));
  const [customerGstin, setCustomerGstin] = useState('');
  const [isDeliveryMode, setIsDeliveryMode] = useState(() => localStorage.getItem('isDeliveryMode') === 'true');

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      const parsed = saved ? JSON.parse(saved) : {};
      if (parsed["[object Object]"]) delete parsed["[object Object]"];
      if (parsed["undefined"]) delete parsed["undefined"];
      
      const clean = {};
      Object.entries(parsed || {}).forEach(([key, val]) => {
        if (key === "[object Object]" || key === "undefined") return;
        if (Array.isArray(val)) {
          clean[key] = val;
        } else if (val && typeof val === 'object') {
          clean[key] = Object.values(val);
        } else {
          clean[key] = [];
        }
      });
      return clean;
    } catch { return {}; }
  });

  // -- Refs --
  const isFetchingRef = useRef(false);
  const prevOrderCountRef = useRef(0);
  const prevUserIdRef = useRef(user?._id || user?.id || null);

  // -- Persistence --
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    const userId = user?._id || user?.id;
    if (userId) {
      localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    } else {
      localStorage.setItem('cart_guest', JSON.stringify(cart));
    }
  }, [cart, user]);

  useEffect(() => {
    const currentUserId = user?._id || user?.id || null;
    const prevUserId = prevUserIdRef.current;

    if (currentUserId !== prevUserId) {
      if (currentUserId && !prevUserId) {
        // Transition: Guest -> Logged In (Login)
        try {
          const guestSaved = localStorage.getItem('cart_guest');
          const parsedGuest = guestSaved ? JSON.parse(guestSaved) : {};
          const guestCart = {};
          Object.entries(parsedGuest || {}).forEach(([k, v]) => {
            guestCart[k] = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
          });
          
          const userSaved = localStorage.getItem(`cart_${currentUserId}`);
          const parsedUser = userSaved ? JSON.parse(userSaved) : {};
          const userCart = {};
          Object.entries(parsedUser || {}).forEach(([k, v]) => {
            userCart[k] = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
          });

          // Merge guest cart items into user cart safely
          const merged = { ...userCart };
          let mergedAny = false;

          Object.entries(guestCart || {}).forEach(([shopId, guestItems]) => {
            if (!guestItems || guestItems.length === 0) return;
            if (!merged[shopId]) {
              merged[shopId] = [...guestItems];
              mergedAny = true;
              return;
            }
            const mergedItems = [...merged[shopId]];
            guestItems.forEach(gItem => {
              const gProductId = gItem.product?._id || gItem.product?.id;
              const existingIdx = mergedItems.findIndex(uItem => (uItem.product?._id || uItem.product?.id) === gProductId);
              if (existingIdx > -1) {
                const uItem = mergedItems[existingIdx];
                const maxStock = Number(uItem.product?.stockQuantity || uItem.product?.stock || 9999);
                const newQty = Math.min(uItem.quantity + gItem.quantity, maxStock);
                mergedItems[existingIdx] = { ...uItem, quantity: newQty };
              } else {
                mergedItems.push(gItem);
              }
            });
            merged[shopId] = mergedItems;
            mergedAny = true;
          });

          setCart(merged);
          localStorage.removeItem('cart_guest');
        } catch (err) {
          console.error("Cart merging failed:", err);
        }
      } else if (!currentUserId && prevUserId) {
        // Transition: Logged In -> Guest (Logout)
        try {
          // Save the logged-out user's cart just in case
          localStorage.setItem(`cart_${prevUserId}`, JSON.stringify(cart));
          
          // Clear active cart state & load guest cart
          const guestSaved = localStorage.getItem('cart_guest');
          const parsedGuest = guestSaved ? JSON.parse(guestSaved) : {};
          const guestCart = {};
          Object.entries(parsedGuest || {}).forEach(([k, v]) => {
            guestCart[k] = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
          });
          setCart(guestCart);
        } catch (err) {
          console.error("Cart logout handling failed:", err);
          setCart({});
        }
      } else if (currentUserId && prevUserId && currentUserId !== prevUserId) {
        // Transition: User A -> User B
        try {
          localStorage.setItem(`cart_${prevUserId}`, JSON.stringify(cart));
          const newUserSaved = localStorage.getItem(`cart_${currentUserId}`);
          const parsedNewUser = newUserSaved ? JSON.parse(newUserSaved) : {};
          const newUserCart = {};
          Object.entries(parsedNewUser || {}).forEach(([k, v]) => {
            newUserCart[k] = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
          });
          setCart(newUserCart);
        } catch (err) {
          console.error("Cart switch user handling failed:", err);
          setCart({});
        }
      }
      
      prevUserIdRef.current = currentUserId;
    }
  }, [user]);

  useEffect(() => {
    if (currentShopId) localStorage.setItem('currentShopId', currentShopId);
    else localStorage.removeItem('currentShopId');
  }, [currentShopId]);

  useEffect(() => {
    localStorage.setItem('isDeliveryMode', isDeliveryMode);
  }, [isDeliveryMode]);

  // -- Granular Data Fetching --
  const fetchShops = useCallback(async (pinCode = '') => {
    try {
      const shopsRes = await api.get(`/shops?pinCode=${pinCode}`);
      if (shopsRes.data?.shops) setShops(shopsRes.data.shops);
    } catch (err) {
      console.error('fetchShops error:', err.message);
    }
  }, []);

  const fetchVendorData = useCallback(async () => {
    if (!user || (user.role !== 'vendor' && user.role !== 'staff')) return;
    try {
      const shopRes = await api.get(`/shops/my?_t=${Date.now()}`);
      const vShop = shopRes.data?.shop || null;
      setVendorShop(vShop);

      if (vShop) {
        const [prodRes, ordRes] = await Promise.all([
          api.get(`/products?shopId=${vShop._id}`),
          api.get(`/orders?shopId=${vShop._id}`),
        ]);
        if (prodRes.data?.products) setProducts(prodRes.data.products);
        if (ordRes.data?.orders) setOrders(ordRes.data.orders);
      }
    } catch (err) {
      console.error('fetchVendorData error:', err.message);
    }
  }, [user]);

  const fetchCustomerOrders = useCallback(async () => {
    if (!user || user.role !== 'customer') return;
    try {
      const ordRes = await api.get('/orders/my');
      if (ordRes.data?.orders) setOrders(ordRes.data.orders);
    } catch (err) {
      console.error('fetchCustomerOrders error:', err.message);
    }
  }, [user]);

  const fetchAdminOrders = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const ordRes = await api.get('/orders');
      if (ordRes.data?.orders) setOrders(ordRes.data.orders);
    } catch (err) {
      console.error('fetchAdminOrders error:', err.message);
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    
    // Default fetch: just shops for discovery
    await fetchShops();

    if (user) {
      if (user.role === 'vendor' || user.role === 'staff') {
        await fetchVendorData();
      } else if (user.role === 'admin') {
        await fetchAdminOrders();
      } else {
        await fetchCustomerOrders();
      }
    }
    
    setLoading(false);
    isFetchingRef.current = false;
  }, [user, fetchShops, fetchVendorData, fetchAdminOrders, fetchCustomerOrders]);

  // REMOVED: Global useEffect that fetches on token change. 
  // Pages will now call fetchData() or specific fetchers as needed.


  const alertAudioRef = useRef(null);

  // -- Real-time Order Alerts & Polling --
  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'vendor')) {
      return;
    }

    const pollAndAlert = async () => {
      try {
        let currentOrders = [];

        if (user.role === 'admin') {
          const { data } = await api.get('/orders?limit=50');
          currentOrders = data.orders || [];
          setOrders(currentOrders);
        } else if (user.role === 'vendor' && vendorShop?._id) {
          const { data } = await api.get(`/orders?shopId=${vendorShop._id}&limit=50`);
          currentOrders = data.orders || [];
          setOrders(currentOrders);
        }

        // Show toast if new order just arrived
        if (prevOrderCountRef.current > 0 && currentOrders.length > prevOrderCountRef.current) {
          toast.info("🔔 Unprocessed Orders Detected!", {
            description: user.role === 'admin' ? "New delivery orders need partner assignment." : "New orders are waiting for your acceptance.",
            duration: 5000
          });
        }

        prevOrderCountRef.current = currentOrders.length;
      } catch (err) {
        console.debug("Order alert polling skipped:", err.message);
      }
    };

    const interval = setInterval(pollAndAlert, 12000); // Check every 12 seconds
    pollAndAlert(); // Initial run

    return () => {
      clearInterval(interval);
    };
  }, [user?.role, token, vendorShop?._id]);

  // -- Reactive Sound Alert Controller --
  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'vendor')) {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current = null;
      }
      return;
    }

    let shouldAlert = false;
    if (user.role === 'admin') {
      const hasNewDeliveryNoPartner = orders.some(o => 
        o.status === 'NEW' && 
        o.orderType === 'DELIVERY' && 
        !o.deliveryPartnerId
      );
      const hasRecentlyAcceptedPackingOrder = orders.some(o => {
        if (o.status !== 'PACKING') return false;
        const updateTime = o.updatedAt || o.createdAt;
        if (!updateTime) return false;
        const timeDiffMs = new Date() - new Date(updateTime);
        return timeDiffMs > 0 && timeDiffMs <= 30 * 60 * 1000;
      });
      shouldAlert = hasNewDeliveryNoPartner || hasRecentlyAcceptedPackingOrder;
    } else if (user.role === 'vendor' && vendorShop?._id) {
      shouldAlert = orders.some(o => o.status === 'NEW');
    }

    if (shouldAlert) {
      if (!alertAudioRef.current) {
        // Distinct notification bell
        alertAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        alertAudioRef.current.loop = true;
      }
      alertAudioRef.current.play().catch(() => {
        // Silently catch browser autoplay restrictions
      });
    } else {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current.currentTime = 0;
      }
    }
  }, [orders, user?.role, vendorShop?._id, token]);

  // -- Vendor Shop Fetch --
  const fetchVendorShop = useCallback(async () => {
    try {
      const { data } = await api.get(`/shops/my?_t=${Date.now()}`);
      setVendorShop(data.shop || null);
      return data.shop;
    } catch (err) {
      console.error('fetchVendorShop error:', err.message);
      return null;
    }
  }, []);

  // -- Toggle Shop Status --
  const toggleShopStatus = useCallback(async () => {
    if (!vendorShop?._id) return { success: false };
    try {
      const { data } = await api.patch(`/shops/${vendorShop._id}/toggle`);
      setVendorShop(data.shop);
      toast.success(`Shop is now ${data.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      return { success: true, isActive: data.isActive };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, [vendorShop?._id]);

  // -- Update Shop (Create or Update) --
  const updateShop = useCallback(async (shopData) => {
    const userId = user?._id || user?.id;
    if (!userId) {
      console.warn('updateShop: Authentication check failed. User:', user);
      return { success: false, error: `Authentication failed (ID missing). Please try again in a moment.` };
    }
    
    try {
      // 0. Robust Sanitization of Location Data (GeoJSON [lng, lat] format)
      const sanitizedData = { ...shopData };
      
      // Critical: Remove MongoDB IDs to prevent "Immutable Field" errors during update
      delete sanitizedData._id;
      delete sanitizedData.id;
      delete sanitizedData.__v;

      if (sanitizedData.location) {
        let coords = sanitizedData.location.coordinates;
        
        // Handle various formats (object {lat,lng}, array of objects, or raw array)
        if (coords) {
          let lng, lat;
          if (Array.isArray(coords)) {
            // If it's an array of objects [ {lat, lng} ], extract the first one
            const first = coords[0];
            if (first && typeof first === 'object' && !Array.isArray(first)) {
               lng = first.lng || first.longitude;
               lat = first.lat || first.latitude;
            } else if (typeof first === 'number') {
               // Already a raw array [lng, lat]
               lng = coords[0];
               lat = coords[1];
            }
          } else if (typeof coords === 'object') {
            lng = coords.lng || coords.longitude;
            lat = coords.lat || coords.latitude;
          }

          sanitizedData.location = {
            ...sanitizedData.location,
            type: 'Point',
            coordinates: [
              Number(lng || 75.1240),
              Number(lat || 15.3647)
            ]
          };
        }
      }

      // 1. Try to determine if we should POST or PUT
      let currentShopId = vendorShop?._id;
      
      // If we don't have it in state, try to fetch it first to be safe
      if (!currentShopId) {
        try {
          const { data } = await api.get('/shops/my');
          if (data.shop) {
            currentShopId = data.shop._id;
            setVendorShop(data.shop);
          }
        } catch (fetchErr) {
          // Silent catch
        }
      }

      let data;
      
      if (currentShopId) {
        const res = await api.put(`/shops/${currentShopId}`, sanitizedData);
        data = res.data;
      } else {
        try {
          const res = await api.post('/shops', sanitizedData);
          data = res.data;
        } catch (postErr) {
          // If we get a 409 Conflict, it means the shop exists on server but not in our state
          if (postErr.response?.status === 409) {
            const { data: myData } = await api.get(`/shops/my?_t=${Date.now()}`);
            if (myData.shop) {
              setVendorShop(myData.shop);
              const retryRes = await api.put(`/shops/${myData.shop._id}`, sanitizedData);
              data = retryRes.data;
            } else {
              throw postErr;
            }
          } else {
            throw postErr;
          }
        }
      }

      if (data.shop) setVendorShop(data.shop);
      return { success: true, data: data.shop };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [vendorShop?._id, user?._id, user?.id]);

  // -- Fetch Nearby Shops --
  const fetchNearbyShops = useCallback(async (lat, lng, radius = 10, search = '', pinCode = '') => {
    try {
      const { data } = await api.get(`/shops/nearby?lat=${lat}&lng=${lng}&radius=${radius}&search=${encodeURIComponent(search)}&pinCode=${pinCode}`);
      return data.shops || [];
    } catch (err) {
      return [];
    }
  }, []);

  // -- Place Order --
  const placeOrder = useCallback(async (orderPayload) => {
    try {
      const cartItems = (cart[currentShopId] || []).map(i => ({
        product: i.product,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.image || i.product.imageUrl || '',
      }));

      const { data } = await api.post('/orders', {
        ...orderPayload,
        shopId: currentShopId,
        items: cartItems,
      });

      clearCart();
      toast.success('Order placed successfully!');
      return data.orderId;
    } catch (err) {
      toast.error('Failed to place order: ' + err.message);
      return null;
    }
  }, [user?.id, currentShopId, cart]);

  // -- Create Product --
  const createProduct = async (productData, imageFiles) => {
    try {
      const filesToUpload = Array.isArray(imageFiles) ? imageFiles : (imageFiles ? [imageFiles] : []);
      
      // Upload images in parallel for better performance
      const uploadPromises = filesToUpload.map(async (file) => {
        if (!file) return null;
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.url;
      });

      const imageUrls = (await Promise.all(uploadPromises)).filter(Boolean);

      const sanitizedData = { ...productData };
      delete sanitizedData._id;
      delete sanitizedData.id;

      const { data } = await api.post('/products', {
        ...sanitizedData,
        image: imageUrls[0] || productData.image || '',
        images: imageUrls.length > 0 ? imageUrls : (productData.images || []),
        price: parseFloat(productData.price) || 0,
        mrp: parseFloat(productData.mrp) || 0,
        stock: parseFloat(productData.stockQuantity) || 0,
        wholesalePrice: parseFloat(productData.wholesalePrice) || 0,
        taxRate: parseFloat(productData.taxRate) || 0,
        lowStockThreshold: parseInt(productData.lowStockThreshold) || 5,
        minimumOrderQuantity: parseInt(productData.minimumOrderQuantity) || 1,
      });
      if (data.product) setProducts(prev => [data.product, ...prev]);
      toast.success('Product created!');
      return { success: true, product: data.product };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  // -- Update Product --
  const updateProduct = async (productId, productData, imageFiles) => {
    try {
      const existingImages = productData.images || (productData.image ? [productData.image] : []);
      const filesToUpload = Array.isArray(imageFiles) ? imageFiles : (imageFiles ? [imageFiles] : []);

      // Upload new images in parallel
      const uploadPromises = filesToUpload.map(async (file) => {
        if (!file) return null;
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.url;
      });

      const newImageUrls = (await Promise.all(uploadPromises)).filter(Boolean);
      const finalImages = [...existingImages, ...newImageUrls];

      const { data } = await api.put(`/products/${productId}`, {
        ...productData,
        image: finalImages[0] || '',
        images: finalImages,
        price: parseFloat(productData.price) || 0,
        mrp: parseFloat(productData.mrp) || 0,
        stock: parseFloat(productData.stockQuantity ?? productData.stock) || 0,
      });
      if (data.product) {
        setProducts(prev => prev.map(p => p._id === productId ? data.product : p));
      }
      toast.success('Product updated!');
      return { success: true, product: data.product };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  // -- Delete Product --
  const deleteProduct = async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      setProducts(prev => prev.filter(p => p._id !== productId));
      toast.success('Product deleted');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  // -- Bulk Update Stock --
  const bulkUpdateStock = async (updates) => {
    try {
      await api.patch('/products/bulk-stock', { updates });
      fetchData();
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  // -- Delete Category (set all products in category to "General") --
  const deleteCategory = async (categoryName) => {
    const categoryProducts = products.filter(p => p.category === categoryName && p.shopId === vendorShop?._id);
    try {
      await Promise.all(categoryProducts.map(p =>
        api.put(`/products/${p._id}`, { category: 'General' })
      ));
      fetchData();
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false };
    }
  };

  // -- Fetch Orders (vendor) --
  const fetchOrders = useCallback(async () => {
    if (!user) return { success: false };
    try {
      const url = user.role === 'admin' ? '/orders' : `/orders?shopId=${vendorShop?._id}`;
      const { data } = await api.get(url);
      if (data.orders) setOrders(data.orders);
      return { success: true, data: data.orders };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [vendorShop?._id, user?.role]);

  // -- Update Order Status --
  const updateOrderStatus = useCallback(async (orderId, status) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true, data: data.order };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // -- Cancel Order --
  const cancelOrder = useCallback(async (orderId, reason) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/cancel`, { reason });
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // -- Delete Order --
  const deleteOrder = useCallback(async (orderId) => {
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // -- Create Bill (In-store) --
  const createBill = async (billData) => {
    try {
      const { data } = await api.post('/orders', {
        shopId: billData.shopId,
        items: billData.items,
        totalPrice: billData.totalPrice || billData.total,
        status: 'COMPLETED',
        paymentMethod: billData.paymentMethod,
        cashAmount: billData.cashAmount || 0,
        onlineAmount: billData.onlineAmount || 0,
        customerName: billData.customerName,
        phone: billData.phone,
        orderType: 'IN_STORE_BILL',
        paymentStatus: billData.paymentStatus || 'PAID',
        balanceDue: billData.balanceDue || 0,
        walletExcess: billData.walletExcess || 0,
        customerBusinessName: billData.customerBusinessName,
        customerBusinessAddress: billData.customerBusinessAddress,
      });
      fetchData();
      return { success: true, bill: data.order };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // -- Get Customers (derived from orders) --
  const getCustomers = useCallback(async () => {
    if (!vendorShop?._id) return { customers: [], onlineCount: 0, offlineCount: 0 };
    try {
      const { data } = await api.get(`/orders?shopId=${vendorShop._id}`);
      const ordersData = data.orders || [];
      const customerMap = {};
      let onlineCount = 0, offlineCount = 0;
      ordersData.forEach(o => {
        const key = o.phone || o.userId;
        if (!key) return;
        if (!customerMap[key]) {
          customerMap[key] = { name: o.customerName, phone: o.phone, userId: o.userId, totalSpent: 0, orderCount: 0 };
          if (o.orderType === 'IN_STORE_BILL') offlineCount++;
          else onlineCount++;
        }
        customerMap[key].totalSpent += (o.totalPrice || 0);
        customerMap[key].orderCount += 1;
      });
      return { customers: Object.values(customerMap), onlineCount, offlineCount };
    } catch (err) {
      return { customers: [], onlineCount: 0, offlineCount: 0 };
    }
  }, [vendorShop?._id]);

  // -- Get Order Tracking --
  const getOrderTracking = useCallback(async (orderId) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      return data.order;
    } catch { return null; }
  }, []);

  // -- Staff --
  const getStaff = useCallback(async () => {
    if (!vendorShop?._id) return [];
    try {
      const { data } = await api.get(`/shops/my/staff`);
      return data.users || [];
    } catch { return []; }
  }, [vendorShop?._id]);

  const createStaff = async (staffData) => {
    try {
      const email = staffData.email || `${staffData.phone}@system.zengalla.local`;
      const { data } = await api.post('/auth/register', { 
        ...staffData, 
        email,
        role: 'staff', 
        shopId: vendorShop?._id 
      });
      return { success: true, staff: data.user };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateStaff = async (id, staffData) => {
    try {
      const { data } = await api.patch(`/shops/my/users/${id}/status`, staffData);
      return { success: true, staff: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteStaff = async (id) => {
    try {
      await api.delete(`/shops/my/users/${id}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // -- Delivery Partners --
  const getDeliveryPartners = useCallback(async () => {
    try {
      const url = user?.role === 'admin' ? '/admin/delivery-partners' : '/shops/my/delivery';
      const { data } = await api.get(url);
      return data.users || [];
    } catch { return []; }
  }, [user?.role]);

  const createDeliveryPartner = async (partnerData) => {
    try {
      const email = partnerData.email || `${partnerData.phone}@system.zengalla.local`;
      const { data } = await api.post('/auth/register', { 
        ...partnerData, 
        email,
        role: 'delivery', 
        shopId: vendorShop?._id 
      });
      return { success: true, partner: data.user };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateDeliveryPartner = async (id, partnerData) => {
    try {
      const url = user?.role === 'admin' ? `/admin/users/${id}/status` : `/shops/my/users/${id}/status`;
      const { data } = await api.patch(url, partnerData);
      return { success: true, partner: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteDeliveryPartner = async (id) => {
    try {
      const url = user?.role === 'admin' ? `/admin/users/${id}` : `/shops/my/users/${id}`;
      await api.delete(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // -- Cart Operations --
  const addToCart = useCallback((arg1, arg2, quantity = 1) => {
    let shopId, product;
    if (typeof arg1 === 'string') {
      shopId = arg1;
      product = arg2;
    } else {
      product = arg1;
      shopId = product.shopId || product.shop || arg2;
    }

    if (!shopId || !product) {
      console.warn("addToCart: Missing shopId or product", { shopId, product });
      return;
    }

    const shopCart = cart[shopId] || [];
    const productId = product._id || product.id;
    const existing = shopCart.find(i => (i.product._id || i.product.id) === productId);
    const maxStock = Number(product.stockQuantity || product.stock || 0);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + quantity > maxStock) {
      toast.error(`Only ${maxStock} ${product.unit_type || 'PKT'} available in stock`);
      return;
    }

    setCart(prev => {
      const sCart = prev[shopId] || [];
      const isExisting = sCart.find(i => (i.product._id || i.product.id) === productId);

      if (isExisting) {
        return { 
          ...prev, 
          [shopId]: sCart.map(i => (i.product._id || i.product.id) === productId 
            ? { ...i, quantity: i.quantity + quantity } 
            : i) 
        };
      }
      return { ...prev, [shopId]: [...sCart, { product, quantity }] };
    });
    
    toast.success(`${product.name} added to cart`);
  }, [cart]);

  const updateQuantity = useCallback((productId, delta, shopId) => {
    const sId = shopId || currentShopId;
    if (!sId) return;

    // Find the item first to check stock
    const shopCart = cart[sId] || [];
    const item = shopCart.find(i => (i.product._id || i.product.id) === productId);
    if (!item) return;

    const maxStock = Number(item.product.stockQuantity || item.product.stock || 0);
    const newQty = item.quantity + delta;

    if (newQty > maxStock) {
      toast.error(`Maximum ${maxStock} available`);
      return;
    }

    setCart(prev => {
      const shopCart = prev[sId] || [];
      const newItems = shopCart.map(i => {
        if ((i.product._id || i.product.id) === productId) {
          return { ...i, quantity: Math.max(0, newQty) };
        }
        return i;
      }).filter(i => i.quantity > 0);

      return { ...prev, [sId]: newItems };
    });
  }, [currentShopId, cart]);

  const setItemQuantity = useCallback((product, quantity, shopId) => {
    const sId = shopId || product.shopId || product.shop || currentShopId;
    if (!sId) return;

    setCart(prev => {
      const shopCart = prev[sId] || [];
      const productId = product._id || product.id;
      const existing = shopCart.find(i => (i.product._id || i.product.id) === productId);

      if (existing) {
        if (quantity <= 0) {
          return { ...prev, [sId]: shopCart.filter(i => (i.product._id || i.product.id) !== productId) };
        }
        return { ...prev, [sId]: shopCart.map(i => (i.product._id || i.product.id) === productId ? { ...i, quantity } : i) };
      }

      if (quantity <= 0) return prev;
      return { ...prev, [sId]: [...shopCart, { product, quantity }] };
    });
  }, [currentShopId]);

  const removeFromCart = useCallback((productId, shopId) => {
    const sId = shopId || currentShopId;
    if (!sId) return;
    setCart(prev => {
      const shopCart = (prev[sId] || []).filter(i => (i.product._id || i.product.id) !== productId);
      return { ...prev, [sId]: shopCart };
    });
  }, [currentShopId]);

  const clearCart = useCallback((shopId) => {
    const sId = shopId || currentShopId;
    if (!sId) return;
    setCart(prev => {
      const next = { ...prev };
      delete next[sId];
      return next;
    });
  }, [currentShopId]);

  const clearAllCart = useCallback(() => {
    setCart({});
    localStorage.removeItem('cart');
    localStorage.removeItem('cart_guest');
    localStorage.removeItem('currentShopId');
    setCurrentShopId(null);
  }, []);

  const cartTotal = useMemo(() => {
    return (cart[currentShopId] || []).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }, [cart, currentShopId]);

  const totalCartItemCount = useMemo(() => {
    // 🛍️ Count unique product entries across all shops, not total pieces/KG
    return Object.values(cart).flat().length;
  }, [cart]);

  // -- Submit Review --
  const submitReview = useCallback(async (reviewData) => {
    try {
      const { data } = await api.post('/reviews', reviewData);
      toast.success('Thank you for your feedback!');
      return { success: true, data: data.review };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // -- Update Order Payment --
  const updateOrderPayment = useCallback(async (orderId, paymentData) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/payment`, paymentData);
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true, data: data.order };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // -- Delivery Context Functions --
  const getAvailableOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/available');
      return data.orders;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const getMyActiveOrder = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/my-active');
      return data.orders;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const acceptOrder = useCallback(async (orderId) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/accept`);
      toast.success('Order assigned to you!');
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true, order: data.order };
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
      return { success: false };
    }
  }, []);

  const assignOrder = useCallback(async (orderId, partnerId, deliveryFee, extraAmount) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/assign`, { partnerId, deliveryFee, extraAmount });
      toast.success('Order assigned to partner');
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true, order: data.order };
    } catch (err) {
      toast.error(err.message);
      return { success: false };
    }
  }, []);

  const rejectOrder = useCallback(async (orderId) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/reject`);
      toast.success('Order assignment rejected');
      setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? data.order : o));
      return { success: true, order: data.order };
    } catch (err) {
      toast.error(err.message);
      return { success: false };
    }
  }, []);

  const updateDeliveryStatus = useCallback(async (orderId, status) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status.replace(/_/g, ' ')}`);
      return { success: true, order: data.order };
    } catch (err) {
      toast.error(err.message);
      return { success: false };
    }
  }, []);

  const getDeliveryHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/delivery-history');
      return data.orders;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const updateDriverLocation = useCallback(async (lat, lng) => {
    try {
      await api.patch('/orders/location', { lat, lng });
    } catch (err) {
      console.error('Location sync failed:', err.message);
    }
  }, []);

  const toggleOnlineStatus = useCallback(async () => {
    try {
      const { data } = await api.patch('/orders/toggle-online');
      toast.success(data.isOnline ? "You are now ONLINE" : "You are now OFFLINE");
      return { success: true, isOnline: data.isOnline };
    } catch (err) {
      toast.error(err.message);
      return { success: false };
    }
  }, []);

  const handleGlobalScan = useCallback((barcode) => {
    // Broadcaster for HID scanners
    console.log('Global Barcode Scan:', barcode);
    window.dispatchEvent(new CustomEvent('global-barcode-scan', { detail: barcode }));
  }, []);

  const getNotifications = useCallback(async (userId, shopId) => {
    try {
      // Clean fallback as customer notifications are primarily web-push based
      return [];
    } catch (err) {
      console.error('getNotifications error:', err);
      return [];
    }
  }, []);

  const value = useMemo(() => ({
    products, shops, orders, setOrders, cart, currentShopId, setCurrentShopId,
    loading, vendorShop, customerGstin, setCustomerGstin,
    cartTotal, totalCartItemCount,
    fetchData, fetchShops, fetchVendorData, fetchCustomerOrders, fetchAdminOrders, fetchVendorShop, fetchNearbyShops,
    toggleShopStatus, updateShop,
    addToCart, removeFromCart, clearCart, clearAllCart, updateQuantity, setItemQuantity,
    placeOrder, cancelOrder,
    createProduct, updateProduct, deleteProduct, bulkUpdateStock, deleteCategory,
    fetchOrders, updateOrderStatus, updateOrderPayment, deleteOrder, createBill,
    getCustomers, getOrderTracking, submitReview,
    getStaff, createStaff, updateStaff, deleteStaff,
    getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner,
    getAvailableOrders, getMyActiveOrder, acceptOrder, assignOrder, rejectOrder, updateDeliveryStatus, getDeliveryHistory, updateDriverLocation, toggleOnlineStatus, handleGlobalScan,
    isDeliveryMode, setIsDeliveryMode, getNotifications
  }), [
    products, shops, orders, cart, currentShopId, loading, vendorShop,
    customerGstin, cartTotal, totalCartItemCount,
    fetchData, fetchShops, fetchVendorData, fetchCustomerOrders, fetchAdminOrders, fetchVendorShop, fetchNearbyShops,
    toggleShopStatus, updateShop,
    addToCart, removeFromCart, clearCart, clearAllCart, updateQuantity, setItemQuantity,
    placeOrder, cancelOrder,
    fetchOrders, updateOrderStatus, updateOrderPayment, deleteOrder,
    getCustomers, getOrderTracking, submitReview, 
    getStaff, createStaff, updateStaff, deleteStaff,
    getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner,
    getAvailableOrders, getMyActiveOrder, acceptOrder, assignOrder, rejectOrder, updateDeliveryStatus, getDeliveryHistory, updateDriverLocation, toggleOnlineStatus, handleGlobalScan,
    isDeliveryMode, setIsDeliveryMode, getNotifications
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => useContext(StoreContext);
