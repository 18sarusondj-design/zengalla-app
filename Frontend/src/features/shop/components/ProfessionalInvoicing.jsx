import React from 'react';
import { ShieldCheck, CheckCircle2, ShoppingBag } from 'lucide-react';

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convert = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    return String(n);
  };
  
  const amountStr = Math.floor(num || 0).toString();
  return convert(parseInt(amountStr)) + ' Only';
};

const ProfessionalInvoicing = ({ bill, shop }) => {
  if (!bill) return null;

  const items = bill.items || [];
  const invoiceNo = bill.invoiceNumber || 'INV-B2B-001';
  const date = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString();
  const total = Number(bill.totalPrice || 0);
  const skyBlue = '#0ea5e9';

  return (
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '15mm', 
      background: 'white', 
      color: '#1e293b', 
      fontFamily: '"Inter", sans-serif',
      fontSize: '11px',
      lineHeight: '1.4'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <div style={{ width: '40px', height: '40px', background: skyBlue, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'white' }}>
              <ShoppingBag size={24} style={{ margin: 'auto' }} />
           </div>
           <h1 style={{ fontSize: '28px', fontWeight: '900', color: skyBlue, margin: 0, letterSpacing: '-1px' }}>
             {shop?.name?.split(' ')[0] || 'ZEN'}<span style={{ color: '#1e293b' }}>GALLA</span>
           </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
           <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#000', margin: 0 }}>TAX INVOICE (B2B)</h2>
           <p style={{ fontSize: '9px', fontWeight: 'bold', color: skyBlue, margin: 0 }}>ORIGINAL FOR RECIPIENT</p>
        </div>
        <div style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>
           Page 1 of 1
        </div>
      </div>

      {/* Seller & Invoice Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', marginBottom: '25px' }}>
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', color: skyBlue }}>{shop?.name || 'Seller Details'}</h3>
          <p style={{ margin: '2px 0', maxWidth: '300px' }}>{shop?.location?.address || 'Shop Address not available'}</p>
          <p style={{ margin: '2px 0' }}>Phone: {shop?.owner?.phone || 'N/A'}</p>
          <p style={{ margin: '2px 0' }}>Email: {shop?.owner?.email || 'N/A'}</p>
          <p style={{ margin: '8px 0 0 0', fontWeight: '900' }}>GSTIN: <span style={{ color: skyBlue }}>{shop?.gstin || '29AABCU9603R1ZP'}</span></p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', border: `1px solid #e2e8f0`, padding: '15px', borderRadius: '12px', background: '#fcfdfe' }}>
           <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>
              <p style={{ margin: '4px 0' }}>Invoice No.</p>
              <p style={{ margin: '4px 0' }}>Invoice Date</p>
              <p style={{ margin: '4px 0' }}>Place of Supply</p>
              <p style={{ margin: '4px 0' }}>Payment Terms</p>
              <p style={{ margin: '4px 0' }}>Due Date</p>
           </div>
           <div style={{ fontSize: '9px', color: '#1e293b', fontWeight: '900', textAlign: 'right' }}>
              <p style={{ margin: '4px 0' }}>: {invoiceNo}</p>
              <p style={{ margin: '4px 0' }}>: {date}</p>
              <p style={{ margin: '4px 0' }}>: {shop?.location?.city || 'Local'}</p>
              <p style={{ margin: '4px 0' }}>: {bill.paymentTerms || 'Due within 15 days'}</p>
              <p style={{ margin: '4px 0' }}>: {date}</p>
           </div>
           <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px', textAlign: 'center' }}>
              {shop?.bankDetails?.upiId && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${shop.bankDetails.upiId}&pn=${shop.name}&am=${total}&cu=INR`)}`}
                    alt="QR"
                    style={{ width: '80px', height: '80px', marginBottom: '5px' }}
                  />
                  <p style={{ fontSize: '7px', fontWeight: 'black', color: '#94a3b8' }}>IRN: {bill._id?.toString().slice(-16)}</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Bill To & Ship To */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
         <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '8px 15px', borderBottom: '1px solid #e2e8f0', fontSize: '9px', fontWeight: '900', color: skyBlue }}>BILL TO (BUYER)</div>
            <div style={{ padding: '12px 15px' }}>
               <h4 style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: '900' }}>{bill.customerBusinessName || bill.customerName}</h4>
               <p style={{ margin: '2px 0', fontSize: '10px', color: '#475569' }}>{bill.customerBusinessAddress || 'Customer Address N/A'}</p>
               <p style={{ margin: '8px 0 0 0', fontSize: '10px', fontWeight: '900' }}>GSTIN: <span style={{ color: skyBlue }}>{bill.customerGstin || 'URD'}</span></p>
            </div>
         </div>
         <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '8px 15px', borderBottom: '1px solid #e2e8f0', fontSize: '9px', fontWeight: '900', color: skyBlue }}>SHIPPED TO</div>
            <div style={{ padding: '12px 15px' }}>
               <h4 style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: '900' }}>{bill.customerBusinessName || bill.customerName}</h4>
               <p style={{ margin: '2px 0', fontSize: '10px', color: '#475569' }}>{bill.customerBusinessAddress || 'Same as Billing'}</p>
            </div>
         </div>
      </div>

      {/* Item Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: skyBlue, color: 'white' }}>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Sr. No.</th>
            <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Item Description</th>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>HSN/SAC</th>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Qty</th>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Unit</th>
            <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Unit Price (₹)</th>
            <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', border: '1px solid rgba(0,0,0,0.1)' }}>Total Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{i + 1}</td>
              <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{item.name || 'Item'}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>{item.hsnCode || '2106'}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>{item.unit || 'Nos'}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{Number(item.price || 0).toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 'bold', fontFamily: 'monospace' }}>{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Calculations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '20px', alignItems: 'flex-start' }}>
         <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px' }}>
            <p style={{ fontSize: '9px', fontWeight: '900', color: skyBlue, marginBottom: '5px', textTransform: 'uppercase' }}>Amount in Words</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0 }}>{numberToWords(total)}</p>
         </div>
         <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>Sub Total</span>
               <span style={{ fontWeight: 'bold' }}>₹{total.toFixed(2)}</span>
            </div>
            <div style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>IGST (0%)</span>
               <span style={{ fontWeight: 'bold' }}>₹0.00</span>
            </div>
            <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', background: skyBlue, color: 'white' }}>
               <span style={{ fontWeight: '900' }}>Grand Total (₹)</span>
               <span style={{ fontSize: '16px', fontWeight: '900' }}>{total.toFixed(2)}</span>
            </div>
         </div>
      </div>

      {/* Footer Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '30px' }}>
         <div>
            <h4 style={{ fontSize: '10px', fontWeight: '900', color: skyBlue, textTransform: 'uppercase', marginBottom: '8px' }}>Payment Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '5px', fontSize: '10px' }}>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>Bank Name</span>
               <span style={{ fontWeight: 'bold' }}>: {shop?.bankDetails?.bankName || 'HDFC Bank'}</span>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>A/c No.</span>
               <span style={{ fontWeight: 'bold' }}>: {shop?.bankDetails?.accountNumber || '50200012345678'}</span>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>IFSC Code</span>
               <span style={{ fontWeight: 'bold' }}>: {shop?.bankDetails?.ifscCode || 'HDFC0001234'}</span>
               <span style={{ fontWeight: 'bold', color: '#64748b' }}>Branch</span>
               <span style={{ fontWeight: 'bold' }}>: {shop?.bankDetails?.branchName || 'Local Branch'}</span>
            </div>
         </div>
         <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', marginBottom: '40px' }}>For {shop?.name || 'Grozy hyperpure Pvt. Ltd.'}</p>
            <div style={{ borderBottom: '1px solid #000', width: '150px' }}></div>
            <p style={{ fontSize: '9px', fontWeight: '900', marginTop: '5px' }}>Authorized Signatory</p>
         </div>
      </div>

      {/* Footer Note */}
      <div style={{ marginTop: '40px', background: '#fef2f2', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #fee2e2' }}>
         <div style={{ background: '#ef4444', color: 'white', padding: '8px', borderRadius: '8px' }}>
            <ShieldCheck size={16} />
         </div>
         <div>
           <p style={{ fontSize: '10px', fontWeight: '900', color: '#991b1b', margin: 0 }}>Thank you for your business!</p>
           <p style={{ fontSize: '8px', color: '#b91c1c', margin: 0 }}>This is a computer generated invoice and does not require a physical signature.</p>
         </div>
      </div>
    </div>
  );
};

export default ProfessionalInvoicing;
