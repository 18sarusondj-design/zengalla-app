import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
import api from '../../../config/api';

import { useAuth } from '../../auth/context/AuthContext';

const SystemUpdateBanner = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [visible, setVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                // If dismissed in current app mount, don't show
                if (isDismissed) return;

                // Don't show to superadmin
                if (user?.role === 'admin') return;

                // Fetch fresh settings to ensure immediate visibility after admin commits
                const response = await api.get('/system/maintenance', { timeout: 5000 });
                
                if (response.data?.settings?.isActive) {
                    const s = response.data.settings;

                    // PERSISTENCE CHECK: If this specific update (by updatedAt) was already acknowledged, don't show
                    const acknowledgedAt = localStorage.getItem('acknowledgedUpdateAt');
                    if (acknowledgedAt === s.updatedAt) return;

                    const scheduledDate = new Date(s.scheduledTime);
                    const now = new Date();
                    
                    // Time difference in days
                    const diffTime = scheduledDate.getTime() - now.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    
                    // Show if:
                    // 1. Scheduled time is in the future
                    // 2. It's within 3 days (approx 72 hours) from now
                    if (scheduledDate > now && diffDays <= 3) {
                        setSettings(s);
                        setVisible(true);
                    }
                }
            } catch (err) {
                console.debug("Maintenance check skipped:", err.message);
            }
        };

        checkMaintenance();
    }, [isDismissed, user]);

    const dismiss = () => {
        if (settings?.updatedAt) {
            localStorage.setItem('acknowledgedUpdateAt', settings.updatedAt);
        }
        setIsDismissed(true);
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

                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 mb-8 space-y-4">
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled For</p>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                {new Date(settings.scheduledTime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs font-bold text-sky-600 uppercase">
                                at {new Date(settings.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="h-px bg-gray-200 w-full" />
                        <p className="text-[11px] font-bold text-gray-600 leading-relaxed uppercase tracking-tight text-center">
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
                        Grozy Infrastructure • Secure Node
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemUpdateBanner;
