import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * A custom hook to manage a piece of state synced with a URL query parameter.
 * @param {string} key - The query parameter key (e.g., 'tab', 'search', 'category')
 * @param {any} defaultValue - The default value if the parameter is missing
 * @returns {[string, function]} - Returns [value, setValue]
 */
export const useQueryParam = (key, defaultValue = '') => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const value = searchParams.get(key) || defaultValue;

  const setValue = useCallback((newValue) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newValue && newValue !== defaultValue) {
        next.set(key, newValue);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [key, defaultValue, setSearchParams]);

  return [value, setValue];
};

export default useQueryParam;
