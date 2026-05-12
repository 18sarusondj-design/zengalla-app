import React from 'react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage = 10,
  totalItems = 0,
  isLoading = false
}) => {
  if (!totalItems) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
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
    <div className="py-4 px-6 border-t border-gray-100 bg-gray-50">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {totalItems > 0 ? `Showing ${startItem} to ${endItem} of ${totalItems}` : 'No items'}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[10px] font-black"
            title="Previous page"
          >
            Prev
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {getPageNumbers().map((page, idx) => (
              <React.Fragment key={idx}>
                {page === '...' ? (
                  <span className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    disabled={isLoading}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                      currentPage === page
                        ? 'bg-sky-500 text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed'
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
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[10px] font-black"
            title="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
