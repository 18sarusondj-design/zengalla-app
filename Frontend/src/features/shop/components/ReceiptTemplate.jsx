import React from 'react';
import { ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';

// Simple utility to convert numbers to words (Limited range for POS)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convert = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    return String(n);
  };
  
  const amountStr = Math.floor(num || 0).toString();
  return convert(parseInt(amountStr));
};

/**
 * ReceiptTemplate - A professional, legally compliant Indian receipt.
 * Optimized for mobile sharing (WhatsApp) and thermal printing.
 */
const ReceiptTemplate = ({ data, shop, staffName }) => {
  if (!data) return null;

  const items = data.items || [];
  
  // Calculate implicit taxes for inclusive pricing
  let calcTaxable = 0;
  let calcTax = 0;
  
  items.forEach(item => {
     const itemTotal = (item.price * item.quantity);
     const rate = item.taxRate != null ? item.taxRate : 18; // Default to 18% if missing
     if (rate > 0) {
        const preTax = itemTotal / (1 + (rate / 100));
        calcTaxable += preTax;
        calcTax += (itemTotal - preTax);
     } else {
        calcTaxable += itemTotal;
     }
  });

  // Proportionally adjust if there's an overall bill discount
  const discountRatio = data.subtotal > 0 ? ((data.subtotal - (data.discountAmount || 0)) / data.subtotal) : 1;
  const finalCalcTaxable = calcTaxable * discountRatio;
  const finalCalcTax = calcTax * discountRatio;

  const taxableAmount = data.taxableAmount || finalCalcTaxable || 0;
  const taxAmount = (data.cgst && data.sgst) ? (data.cgst + data.sgst) : (data.tax || finalCalcTax || 0);
  
  const cgst = data.cgst || (taxAmount / 2) || 0;
  const sgst = data.sgst || (taxAmount / 2) || 0;
  
  const total = data.total || data.totalPrice || 0;
  const invoiceNo = data.invoiceNumber || `INV-${(data._id || data.id || '').toString().slice(-6).toUpperCase()}`;
  const date = data.createdAt ? new Date(data.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString();

  // Determine the effective average tax rate for display (usually 18%, 12%, 5%)
  const totalTaxRate = taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;
  const displayTaxRate = Math.round(totalTaxRate) || 18;

  return (
    <div id="receipt-content" className="bg-white w-full max-w-sm mx-auto pt-8 pb-16 px-4 font-sans text-[10px] leading-relaxed text-gray-800 shadow-2xl border-2 border-gray-100 relative overflow-hidden rounded-xl lg:rounded-b-none">
      
      {/* Background aesthetic */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-brand-primary/5 to-transparent"></div>

      {/* Header */}
      <div className="flex flex-col items-center text-center border-b-2 border-dashed border-gray-200 pb-3 mb-3 relative z-10">
        <div className="w-12 h-12 bg-white rounded-xl shadow-md shadow-brand-primary/10 border border-gray-100 flex items-center justify-center p-1 mb-2">
          {shop?.imageUrl && shop.imageUrl.length > 10 ? (
            <img src={shop.imageUrl} alt="Shop Logo" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center">
               <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
          )}
        </div>
        <h2 className="text-lg font-black uppercase text-gray-900 tracking-tighter leading-none mb-1">{shop?.name || 'SUPERMARKET'}</h2>
        
        {shop?.location?.address && (
          <p className="text-[8px] font-bold text-gray-500 uppercase leading-tight max-w-[200px] mb-2">{shop.location.address}</p>
        )}
        
        <div className="grid grid-cols-1 gap-1 text-[7px] font-black text-gray-500 uppercase tracking-widest">
          {shop?.gstin && <span className="bg-gray-50 px-2 py-1 rounded-full border border-gray-100 flex items-center justify-center gap-1"><ShieldCheck size={8} className="text-sky-600" /> GSTIN: {shop.gstin}</span>}
          {shop?.fssai && <span className="bg-gray-50 px-2 py-1 rounded-full border border-gray-100 flex items-center justify-center gap-1"><CheckCircle2 size={8} className="text-emerald-500" /> FSSAI: {shop.fssai}</span>}
        </div>
      </div>

      {/* Billed To (B2B Details) */}
      {(data.customerBusinessName || data.customerGstin) && (
        <div className="flex flex-col items-center text-center border-b border-gray-100 pb-3 mb-3 relative z-10 bg-sky-50/50 rounded-xl p-2">
          <p className="text-[7px] font-black text-sky-400 uppercase tracking-widest mb-1">Billed To (B2B)</p>
          {data.customerBusinessName && <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{data.customerBusinessName}</h3>}
          {data.customerGstin && <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">GSTIN: <span className="font-mono text-gray-900">{data.customerGstin}</span></p>}
        </div>
      )}

      {/* Invoice Meta */}
      <div className="space-y-1 mb-3 border-b border-gray-100 pb-3 relative z-10">
        <div className="flex justify-between items-center">
          <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">Invoice Number</span>
          <span className="font-black text-gray-900 font-mono text-[10px]">{invoiceNo}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">Date & Time</span>
          <span className="font-black text-gray-900 font-mono text-[9px]">{date}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">Billed By</span>
          <span className="font-black text-gray-900 uppercase text-[9px]">{staffName || data.processedBy?.name || 'Admin'}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">Payment Mode</span>
          <div className="text-right">
            <span className="font-black text-brand-primary uppercase text-[9px] block leading-none">
              {data.paymentMethod === 'SPLIT' ? 'Split Payment' : (data.paymentGateway || data.paymentMethod || 'CASH')}
            </span>
            {data.paymentMethod === 'SPLIT' && (
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5 block">
                Cash: ₹{data.cashAmount?.toFixed(2)} | Online: ₹{data.onlineAmount?.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Item Table (Exact Original Format) */}
      <div className="mb-3 relative z-10 border-t-2 border-gray-900 pt-2 border-b-2 pb-2">
        <div className="grid grid-cols-12 gap-1 text-[8px] font-black uppercase tracking-widest text-gray-900 mb-3 border-b-2 border-gray-900 pb-2">
          <span className="col-span-5">Particulars</span>
          <span className="col-span-2 text-center">HSN</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-3 text-right">Amount (₹)</span>
        </div>
        <div className="space-y-1">
          {items.map((item, idx) => {
            const isWholesale = shop?.isWholesale && item.product?.wholesalePrice > 0 && item.price === item.product.wholesalePrice;
            return (
              <div key={idx} className="grid grid-cols-12 gap-1 items-start text-[10px] leading-tight py-1.5 border-b border-gray-50 last:border-0">
                <div className="col-span-5 pr-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    {isWholesale && (
                      <span className="text-[5px] font-black bg-sky-600 text-white px-1 py-0.5 rounded uppercase leading-none">B2B</span>
                    )}
                    <p className="font-black text-gray-900 uppercase leading-none">{item.name || item.product?.name || 'Item'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-gray-400 font-bold uppercase tracking-tighter">
                      {isWholesale ? 'Wholesale Rate' : `Tax: ${item.taxRate || 18}% Included`}
                    </span>
                  </div>
                </div>
                <span className="col-span-2 text-center text-gray-400 font-mono text-[7px] mt-0.5">{item.product?.hsnCode || '2106'}</span>
                <span className="col-span-2 text-center font-black text-gray-900 text-[10px] mt-0.5">x{item.quantity}</span>
                <span className="col-span-3 text-right font-black font-mono text-gray-900 text-[11px] mt-0.5">
                  {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Summary Matrix */}
      <div className="pt-1 space-y-2 relative z-10">
        <div className="grid grid-cols-3 gap-1 text-[7px] font-black uppercase tracking-tighter border-b border-gray-100 pb-2">
          <div className="flex flex-col">
            <span className="text-gray-400">Taxable Amt</span>
            <span className="text-gray-900 font-mono text-[10px]">₹{taxableAmount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-gray-400">Tax Amt</span>
            <span className="text-gray-900 font-mono text-[10px]">₹{(cgst + sgst).toFixed(2)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sky-600">Net Amt</span>
            <span className="text-gray-900 font-mono text-[10px]">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">
          <span>SGST @ {(displayTaxRate / 2).toFixed(2)}% <span className="text-gray-900 font-mono ml-1">₹{sgst.toFixed(2)}</span></span>
          <span>CGST @ {(displayTaxRate / 2).toFixed(2)}% <span className="text-gray-900 font-mono ml-1">₹{cgst.toFixed(2)}</span></span>
        </div>

        <div className="h-0.5 bg-gray-900 my-1"></div>
        
        <div className="flex justify-between items-center bg-sky-600 p-4 rounded-xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3 z-10">
             <div className="bg-white/20 p-2 rounded-lg">
                <ShoppingBag size={14} />
             </div>
             <div className="flex flex-col">
               <h3 className="text-[10px] font-black uppercase tracking-widest">Total Amount</h3>
               <p className="text-[6px] text-white/70 font-black italic uppercase tracking-tighter">
                 Rs. {numberToWords(data.total || data.totalPrice || 0)} Only.
               </p>
             </div>
          </div>
          <span className="text-2xl font-black font-mono tracking-tighter z-10 border-l border-white/20 pl-4 flex items-baseline">
            <span className="text-xs mr-0.5">₹</span>{(data.total || data.totalPrice || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* QR Code Payment (Added for Scan & Pay) */}
      {shop?.bankDetails?.upiId && (
        <div className="mt-4 flex flex-col items-center border-t border-gray-100 pt-4 bg-gray-50/50 rounded-2xl p-3">
          <p className="text-[7px] font-black text-sky-600 uppercase tracking-widest mb-2">Scan & Pay Online</p>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-sky-100 mb-2">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${shop.bankDetails.upiId}&pn=${shop.name}&am=${total}&cu=INR`)}`}
              alt="Payment QR"
              className="w-20 h-20"
            />
          </div>
          <p className="text-[6px] font-black text-gray-400 uppercase tracking-widest italic">UPI ID: {shop.bankDetails.upiId}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 text-center pt-2 border-t border-dashed border-gray-200 relative z-10">
        <p className="text-[7px] text-gray-400 font-black uppercase italic tracking-widest mb-1">** Prices are Inclusive of all Taxes **</p>
        <p className="text-[8px] font-black text-gray-900 uppercase tracking-widest whitespace-pre-wrap">
          {shop?.footerMessage || 'Thank you! Visit Again.'}
        </p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
