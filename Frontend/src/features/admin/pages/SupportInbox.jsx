import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../auth/context/AuthContext';
import { ShieldAlert, CheckCircle, Loader2, MessageSquare, User, Mail, Calendar, Trash2, X, Send, CornerUpLeft, Phone, Download, RefreshCcw } from 'lucide-react';
import api from '../../../config/api.js';
import Pagination from '../../common/components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SupportInbox = ({ roleFilter }) => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null); // Report object
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token, roleFilter]);

    const fetchReports = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/admin/reports');
        if (data.reports) {
          const filtered = roleFilter 
            ? data.reports.filter(r => r.userRole === roleFilter)
            : data.reports;
          setReports(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        toast.error("Could not sync with support infrastructure");
      } finally {
        setLoading(false);
      }
    };

  const downloadReportsPDF = () => {
    if (reports.length === 0) return toast.error("No reports to download");
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      const title = `${roleFilter === 'vendor' ? 'VENDOR' : 'CUSTOMER'} SUPPORT REGISTRY`;
      
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text(title, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      doc.text(`Total Inquiries: ${reports.length}`, 14, 35);

      const tableColumn = ["Date", "Role", "Sender", "Contact Info", "Message"];
      const tableRows = reports.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        r.userRole?.toUpperCase() || 'N/A',
        r.senderName || 'Anonymous',
        `${r.email}\n${r.phone || 'No Phone'}`,
        r.message.replace(/\[(Order|Shop):.*?\]/gi, '').trim()
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        columnStyles: {
            4: { cellWidth: 80 }
        },
        margin: { top: 45 }
      });

      doc.save(`Support_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Registry Report Downloaded Successfully');
    } catch (err) {
      console.error('PDF Error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

    const handleDeleteReport = async (reportId) => {
      toast.error("Permanently clear this message?", {
        action: {
          label: "Clear",
          onClick: async () => {
            try {
              const { data } = await api.delete(`/admin/reports/${reportId}`);
              if (data.success) {
                toast.success('Message cleared successfully');
                setReports(prev => prev.filter(r => (r._id || r.id) !== reportId));
              }
            } catch (err) {
              toast.error("Failed to delete message");
            }
          }
        }
      });
    };

    const handleSendReply = async () => {
      if (!replyMessage.trim()) return toast.error("Please enter a reply message");
      
      toast.error(`Send reply to ${replyingTo.email}?`, {
        action: {
          label: "Send Reply",
          onClick: async () => {
            setIsSendingReply(true);
            try {
              const { data } = await api.patch(`/admin/reports/${replyingTo._id || replyingTo.id}/reply`, { 
                replyMessage
              });

              if (data.success) {
                toast.success('Response sent and inquiry resolved!');
                setReports(prev => prev.filter(r => (r._id !== (replyingTo._id || replyingTo.id))));
                setReplyingTo(null);
                setReplyMessage('');
              }
            } catch (err) {
              toast.error(err.message);
            } finally {
              setIsSendingReply(false);
            }
          }
        }
      });
    };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-sky-500" size={40} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Syncing Support Stream...</p>
      </div>
    );
  }

  // Pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const paginatedReports = reports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const inboxTitle = roleFilter === 'vendor' ? 'Vendor Support' : roleFilter === 'customer' ? 'Customer Support' : 'Global Support';
  const inboxDesc = roleFilter === 'vendor' ? 'Inquiries and issues reported by shop owners.' : 'Help requests and bug reports from customers.';

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pb-20 pr-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            {roleFilter === 'vendor' ? 'Vendor' : 'Customer'} <span className="text-sky-500">Support</span>
          </h1>
          <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] flex items-center gap-2 mt-4">
            Security Control • <ShieldAlert size={14} /> LIVE QUEUE
          </p>
        </div>
        
        <div className="bg-white px-8 py-5 rounded-full shadow-lg border border-sky-100 flex items-center gap-6">
          <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-sky-100">
            {reports.length}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Incoming</p>
            <p className="text-sm font-black text-gray-900 uppercase tracking-tighter mt-1">Pending Sync</p>
          </div>
        </div>
      </div>

      {/* Main Inbox Card */}
      <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden relative min-h-[500px]">
        <div className="p-8 md:p-10 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between bg-sky-50/10 gap-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-sky-100">
                <MessageSquare size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Incoming <span className="text-sky-500">Messages</span></h2>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={downloadReportsPDF}
                className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all active:scale-95 shadow-xl"
              >
                <Download size={16} /> Export PDF
              </button>
              <button 
                onClick={fetchReports}
                className="w-12 h-12 bg-white border-2 border-gray-100 text-sky-500 rounded-2xl flex items-center justify-center hover:bg-sky-50 hover:border-sky-200 transition-all active:scale-95"
              >
                <RefreshCcw size={20} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-10 py-8">Sender Identity</th>
                <th className="px-10 py-8">Message Context</th>
                <th className="px-10 py-8">Timeline</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <CheckCircle size={64} className="text-sky-500" />
                      <p className="text-sm font-black text-gray-900 uppercase tracking-[0.3em]">Queue Secure & Resolved</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReports.map(report => (
                  <tr key={report._id} className="group hover:bg-sky-50/20 transition-all">
                    <td className="px-10 py-10">
                       <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            report.userRole === 'customer' ? 'bg-sky-100 text-sky-600' : 
                            report.userRole === 'vendor' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {report.userRole || 'User'}
                          </span>
                       </div>
                       <p className="font-black text-gray-900 text-lg leading-tight uppercase flex items-center gap-2">
                         {report.senderName || 'Anonymous'}
                       </p>
                       <p className="text-[10px] font-bold text-gray-400 tracking-tight mt-2 flex items-center gap-2">
                         <Mail size={14} className="text-sky-400" /> {report.email}
                       </p>
                       {report.phone && (
                         <p className="text-[10px] font-bold text-gray-400 tracking-tight mt-1 flex items-center gap-2">
                           <Phone size={14} className="text-sky-400" /> {report.phone}
                         </p>
                       )}
                    </td>
                    <td className="px-10 py-10">
                       <div className="max-w-md bg-gray-50/50 p-8 rounded-[32px] border border-gray-100 italic text-xs font-bold text-gray-600 leading-relaxed group-hover:bg-white transition-colors relative shadow-sm">
                          "{report.message.replace(/\[(Order|Shop):.*?\]/gi, '').trim()}"
                       </div>
                    </td>
                    <td className="px-10 py-10">
                       <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} className="text-sky-500" /> {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-5">
                            {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </td>
                    <td className="px-10 py-10 text-right">
                       <div className="flex items-center justify-end gap-4 transition-all">
                          <button 
                            onClick={() => setReplyingTo(report)}
                            className="w-14 h-14 bg-white border-2 border-gray-100 text-sky-500 rounded-2xl flex items-center justify-center hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all active:scale-90 shadow-sm"
                            title="Reply to User"
                          >
                            <CornerUpLeft size={24} strokeWidth={3} />
                          </button>

                          <button 
                            onClick={() => handleDeleteReport(report._id)}
                            className="w-14 h-14 bg-white border-2 border-gray-100 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-90 shadow-sm"
                            title="Clear Message"
                          >
                            <Trash2 size={22} strokeWidth={3} />
                          </button>
                       </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {reports.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={reports.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white">
            <div className="p-12 pb-0 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Commit <span className="text-sky-500">Response</span></h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Authenticating reply to {replyingTo.senderName}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="p-12 space-y-8">
              <div className="p-8 bg-sky-50/50 rounded-[32px] border border-sky-100 italic text-xs font-bold text-gray-600 leading-relaxed relative">
                 <div className="absolute top-0 left-8 -translate-y-1/2 text-sky-200">
                   <MessageSquare size={24} fill="currentColor" />
                 </div>
                 "{replyingTo.message.replace(/\[(Order|Shop):.*?\]/gi, '').trim()}"
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-sky-600 uppercase tracking-widest ml-6">Resolution Message</label>
                <textarea
                  rows="6"
                  placeholder="Draft resolution strategy..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-[32px] p-8 text-sm font-bold text-gray-800 focus:outline-none transition-all resize-none shadow-inner"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setReplyingTo(null)}
                  className="flex-1 h-16 bg-gray-100 text-gray-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply}
                  className="flex-[2] h-16 bg-sky-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSendingReply ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                  {isSendingReply ? 'Syncing...' : 'Dispatch Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SupportInbox;
