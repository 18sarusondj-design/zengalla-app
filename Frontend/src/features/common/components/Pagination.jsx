import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage = 10,
  totalItems = 0,
  isLoading = false
}) => {
  if (!totalItems || totalItems <= itemsPerPage) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex flex-col">
        <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-1">Navigation Feed</p>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Showing <span className="text-gray-900">{startItem}-{endItem}</span> of <span className="text-gray-900">{totalItems}</span> Nodes
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
          className="w-11 h-11 rounded-2xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-sky-600 hover:border-sky-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 shadow-sm"
        >
          <ChevronLeft size={18} strokeWidth={3} />
        </button>

        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-2xl border border-gray-100">
          {getPageNumbers().map((page, idx) => (
            <React.Fragment key={idx}>
              {page === '...' ? (
                <span className="w-8 text-center text-gray-300 font-black text-[10px]">...</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  disabled={isLoading}
                  className={`w-9 h-9 rounded-xl text-[11px] font-black uppercase transition-all ${
                    currentPage === page
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20 scale-110'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="w-11 h-11 rounded-2xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-sky-600 hover:border-sky-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 shadow-sm"
        >
          <ChevronRight size={18} strokeWidth={3} />
        </button>
      </div>
      
      <div className="hidden lg:block text-right">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Index State</p>
        <p className="text-sm font-black text-gray-900 tracking-tighter uppercase">{currentPage} / {totalPages}</p>
      </div>
    </div>
  );
};

export default Pagination;
