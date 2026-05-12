# Toast Notifications Guide

Your app now has professional toast notifications (top-right corner like your image). Here's how to use them:

## Basic Usage Examples

### 1. **Delete with Confirmation**
```javascript
import { toast } from 'sonner';

const handleDelete = (id) => {
  toast.error("Delete this item?", {
    description: "This action cannot be undone.",
    duration: 5000,
    action: {
      label: "Delete",
      onClick: async () => {
        const res = await deleteItem(id);
        if (res.success) {
          toast.success('Deleted successfully!');
        } else {
          toast.error('Failed to delete');
        }
      }
    }
  });
};
```

### 2. **Success Message**
```javascript
toast.success('Product added successfully!');
```

### 3. **Error Message**
```javascript
toast.error('Failed to update product');
```

### 4. **Info Message**
```javascript
toast.info('Product out of stock');
```

### 5. **Warning Message**
```javascript
toast.warning('This action will affect inventory');
```

### 6. **Promise-based (Loading → Success/Error)**
```javascript
const deleteAllPromise = products.map(p => deleteProduct(p.id));

toast.promise(Promise.all(deleteAllPromise), {
  loading: 'Deleting items...',
  success: 'All items deleted!',
  error: 'Failed to delete some items'
});
```

## Using Utility Functions

I've created `src/utils/toastNotifications.js` with ready-to-use functions:

```javascript
import { 
  showDeleteConfirm, 
  showDeleteSuccess, 
  showDeleteError,
  showSuccess,
  showError,
  showUpdateSuccess,
  showCreateSuccess,
  showInfo,
  showWarning
} from '../../utils/toastNotifications';

// Delete confirmation with callback
showDeleteConfirm(() => {
  deleteProduct(id);
});

// After successful delete
showDeleteSuccess('Product removed!');

// On error
showDeleteError('Failed to delete product');

// For updates
showUpdateSuccess('Product updated!');

// For creating
showCreateSuccess('Product created!');
```

## Real Example from Inventory.jsx

Your Inventory page already does this perfectly:

```javascript
const handleDelete = (id) => {
  toast.error("Delete this product?", {
    description: "This item will be removed from your catalog.",
    duration: 5000,
    action: {
      label: "Delete",
      onClick: async () => {
        const res = await deleteProduct(id);
        if (res.success) {
          toast.success('Product deleted successfully');
        } else {
          toast.error(res.error || 'Failed to delete');
        }
      }
    }
  });
};
```

## Toast Types & Colors

- **`toast.success()`** - Green (success)
- **`toast.error()`** - Red (error/danger)
- **`toast.info()`** - Blue (information)
- **`toast.warning()`** - Orange (warning)
- **`toast()`** - Custom (gray)

## Configuration

The Toaster in `App.jsx` is configured as:
```javascript
<Toaster richColors position="top-right" duration={2000} />
```

- `richColors` - Uses color to distinguish toast types
- `position="top-right"` - Shows in top-right corner like your image
- `duration={2000}` - Closes after 2 seconds (for simple toasts)

## Next Steps

Apply these toasts to all your admin pages:
- ✅ Inventory.jsx (already done)
- Users.jsx
- Orders.jsx
- Customers.jsx
- Billing.jsx
- Any other delete/update operations
