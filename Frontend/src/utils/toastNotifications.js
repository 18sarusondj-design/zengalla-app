import { toast } from 'sonner';

// Delete operations
export const showDeleteConfirm = (onConfirm) => {
  toast((t) => (
    <div className="flex gap-2">
      <span>Are you sure you want to delete?</span>
      <button
        onClick={() => {
          onConfirm();
          toast.dismiss(t);
        }}
        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
      >
        Delete
      </button>
      <button
        onClick={() => toast.dismiss(t)}
        className="bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400"
      >
        Cancel
      </button>
    </div>
  ));
};

export const showDeleteSuccess = (message = 'Deleted successfully!') => {
  toast.success(message);
};

export const showDeleteError = (message = 'Failed to delete. Please try again.') => {
  toast.error(message);
};

// General success messages
export const showSuccess = (message) => {
  toast.success(message);
};

// General error messages
export const showError = (message) => {
  toast.error(message);
};

// Loading/info messages
export const showInfo = (message) => {
  toast.info(message);
};

// Warning messages
export const showWarning = (message) => {
  toast.warning(message);
};

// Update operations
export const showUpdateSuccess = (message = 'Updated successfully!') => {
  toast.success(message);
};

export const showUpdateError = (message = 'Failed to update. Please try again.') => {
  toast.error(message);
};

// Create operations
export const showCreateSuccess = (message = 'Created successfully!') => {
  toast.success(message);
};

export const showCreateError = (message = 'Failed to create. Please try again.') => {
  toast.error(message);
};
