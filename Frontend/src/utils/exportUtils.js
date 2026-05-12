export const exportToCSV = (data, fileName) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  ).join('\n');
  
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generateGSTReport = (orders) => {
  return orders.map(o => ({
    InvoiceNo: o.invoiceNumber || o._id,
    Date: new Date(o.createdAt).toLocaleDateString(),
    Buyer: o.customerBusinessName || o.customerName,
    BuyerGSTIN: o.customerGstin || 'N/A',
    TaxableValue: (o.totalPrice / 1.05).toFixed(2),
    GST_Rate: '5%',
    CGST: (o.totalPrice * 0.025).toFixed(2),
    SGST: (o.totalPrice * 0.025).toFixed(2),
    IGST: '0.00',
    TotalAmount: o.totalPrice.toFixed(2)
  }));
};
