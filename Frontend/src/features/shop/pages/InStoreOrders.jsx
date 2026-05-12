import React, { useState } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { Receipt, Search, Eye, X, Trash2, CheckCircle2, MessageSquare, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../auth/context/AuthContext';
import Pagination from '../../common/components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const InStoreOrders = () => {
  const { 
    orders, products, deleteOrder, bulkDeleteOrders, fetchOrders,
    vendorShop, fetchVendorShop 
  } = useStore();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [printingBill, setPrintingBill] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter only in-store bills
  const bills = orders.filter(
    order => order.orderType === 'IN_STORE_BILL' || order.order_type === 'IN_STORE_BILL'
  );

  React.useEffect(() => {
    const initializeData = async () => {
      if (!vendorShop) await fetchVendorShop();
      
      // Force sync immediately when page opens
      if (fetchOrders) {
        setIsSyncing(true);
        await fetchOrders().catch(console.error);
        setIsSyncing(false);
      }
    };
    if (token) initializeData();
  }, [token, fetchOrders]);

  const handleWhatsAppShare = async () => {
    if (!selectedBill) return;
    const billId = (selectedBill._id || selectedBill.id || '').toString();
    const shortId = billId ? billId.slice(-6).toUpperCase() : 'N/A';

    const msg = `🧾 *THANK YOU FOR SHOPPING!* \n\n` +
                `*Store:* ${vendorShop?.name || 'STORE'}\n` +
                `*Bill:* #${shortId}\n` +
                `*Total:* Rs. ${selectedBill.totalPrice || selectedBill.total_price}`;

    const cleanPhone = selectedBill.phone || '916364563283';
    const finalPhone = cleanPhone.replace(/\D/g, '').length === 10 ? `91${cleanPhone.replace(/\D/g, '')}` : cleanPhone.replace(/\D/g, '');

    const generateAndDownloadPDF = async () => {
       const element = document.getElementById('receipt-history-content');
       if (!element) return;
       const canvas = await html2canvas(element, { scale: 2 });
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF('p', 'mm', 'a4');
       const pdfWidth = pdf.internal.pageSize.getWidth();
       const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
       
       const fileName = `Receipt_${shortId}_${selectedBill.phone || 'GUEST'}.pdf`;
       pdf.save(fileName);
       // Supabase upload removed in MERN migration
    };

    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    toast.info('Downloading HD PDF Receipt. Attach this manually in WhatsApp.');
    await generateAndDownloadPDF();
  };

  const filteredBills = bills.filter(bill => {
    const idStr = (bill._id || bill.id || '').toString().toLowerCase();
    return idStr.includes(searchTerm.toLowerCase()) ||
           (bill.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const generatePDFReport = (filteredData, title) => {
    const doc = new jsPDF();
    finishPDF(doc, filteredData, title);
  };

  const finishPDF = (doc, data, title) => {
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ["Bill ID", "Date", "Customer", "Items", "Total", "Payment"];
    const tableRows = [];

    data.forEach(item => {
      const rowData = [
        (item._id || item.id || "").toString().slice(-6).toUpperCase(),
        new Date(item.createdAt || item.created_at).toLocaleDateString(),
        item.customerName || 'Walk-in',
        item.items?.length || 0,
        `Rs. ${item.totalPrice || item.total_price}`,
        item.paymentMethod
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleBulkAction = async (action) => {
    if (!startDate || !endDate) {
      return toast.error("Please select both Start and End dates");
    }

    const getLocalDateString = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const filtered = filteredBills.filter(o => {
      const dateStr = getLocalDateString(o.createdAt || o.created_at);
      return dateStr >= startDate && dateStr <= endDate;
    });

    if (filtered.length === 0) {
      return toast.info("No records found for this range");
    }

    if (action === 'DOWNLOAD') {
       generatePDFReport(filtered, "Billing History Report");
    } else if (action === 'DELETE') {
      toast.warning(`Delete ${filtered.length} records?`, {
        action: {
          label: "Delete",
          onClick: async () => {
             const res = await bulkDeleteOrders(startDate, endDate);
             if (res.success) toast.success(res.message);
             else toast.error(res.error);
          }
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">History Manager</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Download reports for your records</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-[24px] border border-gray-100 shadow-sm">
          {/* Date Picker Group */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 rounded-xl border border-gray-100">
            <Calendar size={14} className="text-sky-600" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[10px] font-black uppercase outline-none bg-transparent"
            />
            <span className="text-[10px] font-black text-gray-300">TO</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[10px] font-black uppercase outline-none bg-transparent"
            />
          </div>

          <div className="h-8 w-px bg-gray-100 mx-1" />

          <button 
            onClick={() => handleBulkAction('DOWNLOAD')}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-100"
          >
            Download PDF
          </button>

          <div className="relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search ID/Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs w-48"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Bill ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBills.map((bill) => (
                <tr key={bill._id || bill.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Receipt size={16} className="text-brand-primary" />
                      #{(bill._id || bill.id || "").toString().slice(-6).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4">{new Date(bill.createdAt || bill.created_at || Date.now()).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium">{bill.customerName}</td>
                  <td className="px-6 py-4">
                    <span className="bg-sky-100 text-sky-700 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider text-xs">
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4">{bill.items?.length || 0}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">₹{bill.totalPrice || bill.total_price}</td>
                  <td className="px-6 py-4">
                    {bill.balanceDue > 0 ? (
                      <span className="text-rose-600 font-black">₹{bill.balanceDue.toFixed(2)}</span>
                    ) : (
                      <span className="text-emerald-500 font-bold">PAID</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          const billId = (bill._id || bill.id || '').toString();
                          const shortId = billId ? billId.slice(-6).toUpperCase() : 'N/A';
                          const msg = `THANK YOU FOR SHOPPING WITH US!\n\nStore: ${vendorShop?.name || 'STORE'}\nBill: #${shortId}\nTotal: Rs. ${bill.totalPrice || bill.total_price}`;
                          const phone = bill.phone || '916364563283';
                          const finalPhone = phone.replace(/\D/g, '').length === 10 ? `91${phone.replace(/\D/g, '')}` : phone.replace(/\D/g, '');
                          window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="text-emerald-500 hover:text-white p-1.5 border border-emerald-100 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center aspect-square"
                        title="Quick WhatsApp Share"
                      >
                        <MessageSquare size={16} />
                      </button>
                      
                      <button 
                        onClick={() => setSelectedBill(bill)}
                        className="text-brand-primary hover:text-sky-700 font-medium px-3 py-1.5 border border-brand-primary/30 rounded-lg hover:bg-brand-primaryLight transition-all inline-flex items-center gap-1"
                      >
                        <Eye size={16} /> View
                      </button>

                      <button 
                        onClick={() => {
                          toast.error("Delete this bill?", {
                            action: {
                              label: "Delete",
                              onClick: () => deleteOrder(bill._id || bill.id)
                            }
                          });
                        }}
                        className="text-red-500 hover:text-white font-medium p-1.5 border border-red-100 rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center aspect-square"
                        title="Delete Bill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">No in-store bills found</p>
                    <p className="text-sm mt-1">Start processing bills on the Billing page.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredBills.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredBills.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Bill View Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[95vh] relative text-center">
            <button onClick={() => setSelectedBill(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 z-10 no-print"><X size={20}/></button>
            <div id="receipt-history-content" className="p-8 overflow-y-auto flex-1 font-mono space-y-4 bg-white">
              <div className="border-b-2 border-dashed border-gray-200 pb-4">
                <h2 className="text-xl font-black uppercase text-brand-primary tracking-tighter leading-none">{vendorShop?.name || 'RECEIPT'}</h2>
                {vendorShop?.gstin && <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">GSTIN: {vendorShop.gstin}</p>}
                {vendorShop?.fssai && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">FSSAI: {vendorShop.fssai}</p>}
                {vendorShop?.location?.address && <p className="text-[9px] text-gray-400 uppercase mt-1.5 leading-tight max-w-[200px] mx-auto">{vendorShop.location.address}</p>}
              </div>

              <div className="text-left py-4 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between border-b border-gray-50 pb-1.5 mb-1.5">
                   <span className="font-bold">Bill #{(selectedBill._id || selectedBill.id || "").toString().slice(-6).toUpperCase()}</span>
                   <span>{new Date(selectedBill.createdAt || selectedBill.created_at || Date.now()).toLocaleString()}</span>
                </div>
                <p className="flex justify-between uppercase tracking-tighter"><span>Customer:</span> <span className="font-black text-gray-900">{selectedBill.customerName || 'Walk-in'}</span></p>
                
                <div className="border-y-2 border-dashed border-gray-100 py-3 my-3 space-y-2">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items Summary</p>
                  {selectedBill.items.map((item, idx) => {
                     let productItem = item.product;
                     let productName = item.name || 'Unknown Product';
                     
                     if (!item.name && typeof productItem === 'object' && productItem !== null) {
                         productName = productItem.name;
                     } else if (!item.name) {
                         const found = products.find(p => (p._id || p.id) === productItem);
                         if (found) productName = found.name;
                     }
                     return (
                      <div key={idx} className="flex justify-between items-start gap-4 text-sm">
                        <span className="flex-1 leading-tight">{productName} <span className="text-gray-400 text-[10px]">x{item.quantity}</span></span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                     );
                  })}
                </div>
                
                <div className="flex justify-between items-end mt-4 pt-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total</p>
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">₹{selectedBill.totalPrice || selectedBill.total_price}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest border border-brand-primary/20 px-2 py-0.5 rounded-md inline-block">Paid via {selectedBill.paymentMethod}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t-2 border-dashed border-gray-100 italic text-[10px] text-gray-400 uppercase tracking-widest">
                Thank you for your purchase!
              </div>
            </div>
            
            <div className="p-4 bg-white space-y-2 border-t no-print">
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={handleWhatsAppShare}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <MessageSquare size={16} /> WhatsApp
                </button>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="w-full bg-gray-50 text-gray-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InStoreOrders;
