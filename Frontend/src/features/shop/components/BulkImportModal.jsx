import React, { useState, useRef } from 'react';
import { X, Upload, FileDown, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useStore } from '../../shop/context/StoreContext';
import { toast } from 'sonner';

const BulkImportModal = ({ isOpen, onClose }) => {
  const { bulkUploadProducts } = useStore();
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const template = [
      ['Name', 'Price', 'Category', 'StockQuantity', 'Description', 'Barcode', 'SellingType'],
      ['Fresh Apple', '120', 'Fruits', '50', 'Sweet red apples from Himachal', '8901234567890', 'weight'],
      ['Amul Milk 1L', '66', 'Dairy', '20', 'Full cream milk', '8901230000001', 'piece']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'product_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    const allowed = ['csv', 'xlsx', 'xls'];
    if (!allowed.includes(fileExt)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    setIsProcessing(true);
    const reader = new FileReader();
    const fileExt = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      const data = e.target.result;
      let results = [];

      try {
        const mapRow = (row) => {
          // Flexible mapping for different header names
          const name = row.Name || row.name || row['Product Name'] || row.Item || '';
          const price = parseFloat(row.Price || row.price || row['Selling Price'] || row.Rate || row.MRP || 0);
          const mrp = parseFloat(row.MRP || row.mrp || row['MRP'] || price || 0);
          const purchasePrice = parseFloat(row.PurchasePrice || row.purchasePrice || row['Purchase Price'] || row.Cost || 0);
          const category = row.Category || row.category || 'General';
          
          // Stock handling: prioritize 'Order Quantity' (if filled) over 'Current Stock'
          const currentStock = parseInt(row.StockQuantity || row.stockQuantity || row['Current Stock'] || row.Stock || row.Qty || 0);
          const orderQty = parseInt(row['Order Quantity (FILL THIS)'] || row.OrderQty || 0);
          const finalStock = orderQty > 0 ? orderQty : currentStock;
          
          const description = row.Description || row.description || '';
          const barcode = row.Barcode || row.barcode || row['Barcode/SKU'] || row.SKU || '';
          const unit = row.Unit || row.unit || '';
          
          let sellingType = (row.SellingType || row.sellingType || row['Selling Type'] || row.Type || 'piece').toLowerCase();
          if (sellingType.includes('weight') || sellingType.includes('kg') || sellingType.includes('loose')) sellingType = 'weight';
          else sellingType = 'piece';

          return {
            name,
            price,
            mrp,
            purchasePrice,
            category,
            stockQuantity: finalStock,
            description,
            barcode,
            unit,
            sellingType
          };
        };

        if (fileExt === 'csv') {
          // Parse CSV
          const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
          results = parsed.data.map(mapRow);
        } else {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          results = sheetData.map(mapRow);
        }

        // Filter out completely empty rows
        results = results.filter(p => p.name);
        
        if (results.length === 0) {
          toast.error('No valid product data found in file');
          setIsProcessing(false);
          return;
        }

        setParsedData(results);
        setStep(2);
      } catch (err) {
        console.error('Parsing error:', err);
        toast.error('Failed to parse file. Check format.');
      } finally {
        setIsProcessing(false);
      }
    };

    if (fileExt === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUpload = async () => {
    setIsProcessing(true);
    const res = await bulkUploadProducts(parsedData);
    setIsProcessing(false);

    if (res.success) {
      setStep(3);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bulk Product Import</h2>
            <p className="text-gray-500 text-sm font-medium">Add hundreds of products in seconds</p>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          
          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                   Upload Spreadsheet 
                   <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">CSV & EXCEL</span>
                </h3>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-[32px] py-16 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-brand-primary/30 transition-all group"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-primaryLight group-hover:scale-110 transition-all duration-300">
                    <Upload size={32} className="text-gray-400 group-hover:text-brand-primary" />
                  </div>
                  <p className="text-gray-900 font-bold text-lg">Click to select File</p>
                  <p className="text-gray-500 text-sm mt-1">Supports CSV, XLSX, and XLS</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                   <CheckCircle2 className="text-brand-primary" size={24} />
                   Previewing {parsedData.length} Products
                 </h3>
                 <button onClick={() => setStep(1)} className="text-sm font-bold text-gray-500 hover:text-gray-900">Change File</button>
              </div>

              <div className="border rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-700">Name</th>
                        <th className="px-4 py-3 font-bold text-gray-700">Category</th>
                        <th className="px-4 py-3 font-bold text-gray-700">Price</th>
                        <th className="px-4 py-3 font-bold text-gray-700">Stock</th>
                        <th className="px-4 py-3 font-bold text-gray-700">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedData.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-gray-500">{row.category}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">₹{row.price}</td>
                          <td className="px-4 py-3 text-gray-600">{row.stockQuantity}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.barcode || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 50 && (
                  <div className="bg-gray-50 p-3 text-center text-xs text-gray-500 font-medium">
                    Showing first 50 of {parsedData.length} items
                  </div>
                )}
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-sky-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-sky-800 leading-relaxed font-medium">
                  <strong>Verification Required:</strong> Please ensure all product names and prices are correct. Already existing products with the same name will be created as new entries.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-brand-primaryLight text-brand-primary rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Import Successful!</h3>
              <p className="text-gray-600 max-w-sm mb-8 font-medium">Your storefront has been updated with {parsedData.length} new products. They are now visible to your customers.</p>
              <button 
                onClick={reset}
                className="bg-brand-primary hover:bg-sky-700 text-white px-8 py-3 rounded-full font-black shadow-lg shadow-brand-primary/20 transition-transform active:scale-95"
              >
                Back to Inventory
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">Ready to import {parsedData.length} products</span>
            <div className="flex gap-3">
              <button 
                onClick={reset}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-brand-primary hover:bg-sky-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin" size={18} /> Processing...</>
                ) : 'Complete Import'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BulkImportModal;
