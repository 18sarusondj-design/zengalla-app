import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { Search, Sparkles, Calendar, ArrowUpAZ, Check, ShieldAlert, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, MapPin, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const SponsorshipManagement = () => {
  const [pinCode, setPinCode] = useState('');
  const [searchedPinCode, setSearchedPinCode] = useState('');
  const [shops, setShops] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSponsorshipId, setEditingSponsorshipId] = useState(null);

  const [allShops, setAllShops] = useState([]);
  const [pinDropdownOpen, setPinDropdownOpen] = useState(false);
  const [pinSearch, setPinSearch] = useState('');
  const [pinAreaMap, setPinAreaMap] = useState({});

  useEffect(() => {
    const fetchAllShops = async () => {
      try {
        const { data } = await api.get('/shops');
        if (data?.shops) {
          setAllShops(data.shops);
          const initialMap = {};
          data.shops.forEach(s => {
            if (s.pinCode && s.address) {
              const parts = s.address.split(',');
              const area = parts.find(p => p.trim().length > 3 && !p.includes(s.pinCode)) || '';
              if (area) initialMap[s.pinCode] = area.trim().toUpperCase();
            }
          });
          setPinAreaMap(prev => ({ ...prev, ...initialMap }));
        }
      } catch (err) {
        console.error("Failed to load baseline shops:", err);
      }
    };
    fetchAllShops();
  }, []);

  const uniquePins = useMemo(() => {
    const pins = [...new Set(allShops.filter(s => s.pinCode && s.pinCode !== 'N/A').map(s => s.pinCode))];
    return pins.sort();
  }, [allShops]);

  useEffect(() => {
    if (uniquePins.length === 0) return;
    const pinsToFetch = uniquePins.filter(p => !pinAreaMap[p]);
    if (pinsToFetch.length === 0) return;

    pinsToFetch.forEach(async (pin) => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const json = await res.json();
        const postOffices = json?.[0]?.PostOffice;
        if (postOffices && postOffices.length > 0) {
          const apiAreas = postOffices.map(po => po.Name.toUpperCase());
          const shopsInPin = allShops.filter(s => s.pinCode === pin);
          const activeAreas = apiAreas.filter(area => 
            shopsInPin.some(s => (s.address || '').toUpperCase().includes(area) || (s.name || '').toUpperCase().includes(area))
          );
          const finalAreas = activeAreas.length > 0 
            ? [...new Set(activeAreas)].join(", ") 
            : postOffices[0].District;
          setPinAreaMap(prev => ({ ...prev, [pin]: finalAreas }));
        }
      } catch (err) {
        console.warn(`Could not fetch area for PIN ${pin}`);
      }
    });
  }, [uniquePins, allShops]);

  const handleSelectPinCode = async (selectedPin) => {
    setPinCode(selectedPin);
    setPinDropdownOpen(false);
    setLoading(true);
    try {
      const [shopsRes, sponsorshipRes] = await Promise.all([
        api.get(`/admin/shops/by-pincode/${selectedPin}`),
        api.get(`/admin/sponsorships?pinCode=${selectedPin}`)
      ]);

      if (shopsRes.data?.success) {
        setShops(shopsRes.data.shops || []);
      }
      if (sponsorshipRes.data?.success) {
        setSponsorships(sponsorshipRes.data.sponsorships || []);
      }
      setSearchedPinCode(selectedPin);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  
  // Form fields for adding/editing sponsorship
  const [selectedShopId, setSelectedShopId] = useState('');
  const [priority, setPriority] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search sponsorships and shops when PIN code is submitted
  const handlePinSearch = async (e) => {
    if (e) e.preventDefault();
    if (!pinCode || pinCode.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit PIN code');
      return;
    }

    setLoading(true);
    try {
      const [shopsRes, sponsorshipRes] = await Promise.all([
        api.get(`/admin/shops/by-pincode/${pinCode}`),
        api.get(`/admin/sponsorships?pinCode=${pinCode}`)
      ]);

      if (shopsRes.data?.success) {
        setShops(shopsRes.data.shops || []);
      }
      if (sponsorshipRes.data?.success) {
        setSponsorships(sponsorshipRes.data.sponsorships || []);
      }
      setSearchedPinCode(pinCode);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Add a new sponsorship
  const handleAddSponsorship = async (e) => {
    e.preventDefault();
    if (!selectedShopId) {
      toast.error('Please select a shop to sponsor');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shopId: selectedShopId,
        pinCode: searchedPinCode,
        priority: Number(priority),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive
      };

      const { data } = await api.post('/admin/sponsorships', payload);
      if (data.success) {
        toast.success('Shop marked as sponsored successfully!');
        // Refresh list
        handlePinSearch();
        // Reset form
        setSelectedShopId('');
        setPriority(1);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setIsActive(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create sponsorship');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a sponsorship
  const handleDeleteSponsorship = (id) => {
    toast('Remove shop from sponsored listings?', {
      action: {
        label: 'Delete',
        onClick: () => executeDeleteSponsorship(id)
      },
      duration: 5000
    });
  };

  const executeDeleteSponsorship = async (id) => {
    try {
      const { data } = await api.delete(`/admin/sponsorships/${id}`);
      if (data.success) {
        toast.success('Sponsorship removed successfully');
        setSponsorships(prev => prev.filter(s => s._id !== id));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete');
    }
  };

  // Toggle active status instantly
  const handleToggleActive = async (sponsorship) => {
    try {
      const { data } = await api.put(`/admin/sponsorships/${sponsorship._id}`, {
        isActive: !sponsorship.isActive
      });
      if (data.success) {
        toast.success(`Sponsorship ${!sponsorship.isActive ? 'Enabled' : 'Disabled'} successfully`);
        setSponsorships(prev => prev.map(s => s._id === sponsorship._id ? data.sponsorship : s));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update status');
    }
  };

  // Save quick edits to priority or dates
  const handleSaveQuickEdit = async (id, updatedFields) => {
    try {
      const { data } = await api.put(`/admin/sponsorships/${id}`, updatedFields);
      if (data.success) {
        toast.success('Sponsorship details updated');
        setSponsorships(prev => prev.map(s => s._id === id ? data.sponsorship : s));
        setEditingSponsorshipId(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save edits');
    }
  };

  // Calculate available shops that aren't already sponsored in this PIN code
  const availableShops = shops.filter(
    shop => !sponsorships.some(s => s.shopId?._id === shop._id || s.shopId === shop._id)
  );

  return (
    <div className="flex flex-col min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Sponsored <span className="text-sky-500">Shops</span>
          </h1>
          <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.3em]">
            Manage location-specific sponsored shop rankings by PIN code.
          </p>
        </div>

        {/* PIN Code Lookup Bar & Dropdown */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setPinDropdownOpen(o => !o); setPinSearch(''); }}
                className={`flex items-center gap-2 px-6 py-4 rounded-full border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                  pinDropdownOpen
                    ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600 shadow-sm'
                }`}
              >
                <MapPin size={13} />
                {searchedPinCode ? `Area: ${searchedPinCode}` : 'Select Area / Location'}
                <span className="opacity-60 text-[10px]">{pinDropdownOpen ? '▲' : '▼'}</span>
              </button>

              {pinDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search pin code..."
                      value={pinSearch}
                      onChange={e => setPinSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {uniquePins
                      .filter(p => {
                        const search = pinSearch.toLowerCase();
                        const areaName = (pinAreaMap[p] || '').toLowerCase();
                        return p.includes(search) || areaName.includes(search);
                      })
                      .map(pin => (
                        <button
                          key={pin}
                          type="button"
                          onClick={() => handleSelectPinCode(pin)}
                          className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-between border-t border-gray-50 ${
                            searchedPinCode === pin ? 'bg-sky-50 text-sky-600' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex flex-col">
                            <span className="flex items-center gap-2">
                              <MapPin size={10} className="text-sky-400" />
                              {pin}
                            </span>
                            {pinAreaMap[pin] && (
                              <span className="text-[8px] opacity-70 ml-4 font-black text-sky-500 uppercase tracking-wider">{pinAreaMap[pin]}</span>
                            )}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">{allShops.filter(s => s.pinCode === pin).length} shops</span>
                        </button>
                      ))
                    }
                    {uniquePins.filter(p => p.includes(pinSearch)).length === 0 && (
                      <p className="px-4 py-4 text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">No pin codes found</p>
                    )}
                  </div>
                </div>
              )}

              {pinDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setPinDropdownOpen(false)} />
              )}
            </div>

          <form onSubmit={handlePinSearch} className="flex items-center gap-3">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                maxLength={6}
                placeholder="Enter PIN Code..."
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="pl-12 pr-6 py-4 w-56 rounded-full border border-gray-200 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 font-bold text-sm tracking-widest text-gray-800 transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="p-4 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center h-[54px] w-[54px] shrink-0"
              title="Lookup PIN Code"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5 text-white" />}
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center font-black text-gray-300 uppercase tracking-widest animate-pulse flex items-center justify-center gap-3">
          <Loader2 className="animate-spin h-6 w-6 text-sky-500" />
          Loading store registries...
        </div>
      ) : searchedPinCode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Add Sponsorship Panel */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl shadow-gray-100/40 space-y-6">
            <div>
              <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
                <Plus className="h-5 w-5 text-sky-500" /> Sponsor a Store
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Pin code: {searchedPinCode}
              </p>
            </div>

            {availableShops.length === 0 ? (
              <div className="p-6 bg-amber-50 text-amber-800 rounded-3xl border border-amber-100 text-xs font-bold leading-relaxed">
                {shops.length === 0 
                  ? `No stores are registered in PIN code ${searchedPinCode}.`
                  : `All stores in PIN code ${searchedPinCode} are already sponsored.`}
              </div>
            ) : (
              <form onSubmit={handleAddSponsorship} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Select Shop</label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white text-xs font-bold text-gray-800 focus:outline-none transition-all"
                  >
                    <option value="">-- Choose Store --</option>
                    {availableShops.map(shop => (
                      <option key={shop._id} value={shop._id}>{shop.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Sponsorship Priority</label>
                  <input
                    type="number"
                    min={1}
                    value={priority}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPriority(val ? Math.max(1, parseInt(val)) : '');
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white text-xs font-bold text-gray-800 focus:outline-none transition-all"
                  />
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider ml-2">Lower number = Higher ranking</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white text-xs font-bold text-gray-800 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white text-xs font-bold text-gray-800 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enable Instantly</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="focus:outline-none"
                  >
                    {isActive ? (
                      <ToggleRight className="h-8 w-8 text-sky-500" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-300" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="animate-spin h-3 w-3" />}
                  Add Sponsorship
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Sponsorship List */}
          <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl shadow-gray-100/40 space-y-6">
            <div>
              <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-500" /> Active Sponsorships
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Sponsorships currently configured for PIN code {searchedPinCode}
              </p>
            </div>

            {sponsorships.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-[32px]">
                No active sponsorships configured for this area.
              </div>
            ) : (
              <div className="space-y-4">
                {sponsorships.map((s) => {
                  const shopName = s.shopId?.name || 'Unknown Store';
                  const isEditing = editingSponsorshipId === s._id;

                  return (
                    <div 
                      key={s._id}
                      className={`p-6 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        s.isActive ? 'border-sky-100 bg-sky-50/10' : 'border-gray-100 bg-gray-50/30'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-sm text-gray-900 uppercase tracking-tight leading-none">
                            {shopName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                            s.isActive ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            Priority {s.priority}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-sky-400" />
                            {new Date(s.startDate).toLocaleDateString('en-IN')} - {new Date(s.endDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Editing Panel or Quick Actions */}
                      <div className="flex items-center gap-3 justify-end shrink-0">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                defaultValue={s.priority}
                                id={`priority-${s._id}`}
                                className="w-16 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-center outline-none focus:border-sky-400"
                                title="Priority"
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(/[^0-9]/g, '');
                                }}
                              />
                              <input
                                type="date"
                                defaultValue={new Date(s.endDate).toISOString().split('T')[0]}
                                id={`endDate-${s._id}`}
                                className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:border-sky-400"
                                title="End Date"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const pVal = parseInt(document.getElementById(`priority-${s._id}`).value);
                                  handleSaveQuickEdit(s._id, {
                                    priority: isNaN(pVal) || pVal < 1 ? 1 : pVal,
                                    endDate: new Date(document.getElementById(`endDate-${s._id}`).value)
                                  });
                                }}
                                className="px-4 py-2 bg-sky-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-sky-700 transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingSponsorshipId(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-600 text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingSponsorshipId(s._id)}
                              className="p-2 bg-gray-50 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                              title="Edit Sponsorship"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(s)}
                              className={`p-2 rounded-xl border transition-all ${
                                s.isActive 
                                  ? 'bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100' 
                                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                              }`}
                              title={s.isActive ? 'Disable Sponsorship' : 'Enable Sponsorship'}
                            >
                              {s.isActive ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteSponsorship(s._id)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all"
                              title="Delete Sponsorship"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-gray-100 rounded-[32px] shadow-sm text-center space-y-4">
          <MapPin className="h-16 w-16 text-gray-200" strokeWidth={1.5} />
          <h3 className="text-lg font-black text-gray-900 uppercase">Search by PIN Code</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Enter a 6-digit delivery PIN code in the search box above to configure location-based store sponsorships.
          </p>
        </div>
      )}
    </div>
  );
};

export default SponsorshipManagement;
