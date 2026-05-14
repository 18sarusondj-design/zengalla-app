import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
import api from '../../../config/api';

const SystemUpdateBanner = () => {
    const [settings, setSettings] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                // Only show if not dismissed in this session
                const isDismissed = sessionStorage.getItem('system-update-dismissed');
                if (isDismissed) return;

                // Caching: Only check every 10 minutes to save API calls
                const lastCheck = sessionStorage.getItem('maintenance-last-check');
                const cachedData = sessionStorage.getItem('maintenance-data');
                
                if (lastCheck && cachedData && (Date.now() - parseInt(lastCheck) < 600000)) {
                    const data = JSON.parse(cachedData);
                    if (data?.settings?.isActive) {
                        const s = data.settings;
                        if (s.scheduledTime && new Date(s.scheduledTime) > new Date()) {
                            setSettings(s);
                            setVisible(true);
                        }
                    }
                    return;
                }

                // Use a short timeout for this non-critical check
                const response = await api.get('/system/maintenance', { timeout: 5000 });
                
                sessionStorage.setItem('maintenance-last-check', Date.now().toString());
                sessionStorage.setItem('maintenance-data', JSON.stringify(response.data));

                if (response.data?.settings?.isActive) {
                    const s = response.data.settings;
                    
                    // Check if the scheduled time is in the future
                    if (s.scheduledTime && new Date(s.scheduledTime) > new Date()) {
                        setSettings(s);
                        setVisible(true);
                    }
                }
            } catch (err) {
                // Silently fail for maintenance check to not disturb user experience
                console.debug("Maintenance check skipped:", err.message);
            }
        };

        checkMaintenance();
    }, []);

    const dismiss = () => {
        sessionStorage.setItem('system-update-dismissed', 'true');
        setVisible(false);
    };

    if (!visible || !settings) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="relative p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[30px] flex items-center justify-center mb-6 shadow-xl shadow-amber-200/50">
                        <AlertTriangle size={40} strokeWidth={2.5} className="animate-pulse" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">
                        System Notice
                    </h3>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Clock size={14} /> Scheduled Maintenance
                    </p>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 mb-8">
                        <p className="text-xs font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                            {settings.message}
                        </p>
                    </div>

                    <button 
                        onClick={dismiss}
                        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-sky-600 transition-all shadow-xl active:scale-95"
                    >
                        I Understand
                    </button>

                    <p className="mt-4 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                        Zengalla Infrastructure • Secure Node
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemUpdateBanner;
