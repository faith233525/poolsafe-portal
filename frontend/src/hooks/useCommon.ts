import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Custom hook for fetching data with loading, error states
 */
export function useApiData<T>(url: string, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('jwt');
        const response = await apiFetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (!cancelled) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  const refetch = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('jwt');
        const response = await apiFetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  return { data, loading, error, refetch };
}

/**
 * Custom hook for form state management
 */
export function useFormState<T>(initialState: T) {
  const [form, setForm] = useState<T>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = (field: keyof T, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const setFieldError = (field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const clearErrors = () => setErrors({});
  const reset = () => {
    setForm(initialState);
    setErrors({});
  };

  return {
    form,
    setForm,
    errors,
    setErrors,
    handleChange,
    setFieldError,
    clearErrors,
    reset
  };
}

/**
 * Custom hook for local storage state
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Failed to store value in localStorage for key "${key}":`, error);
    }
  };

  return [value, setStoredValue] as const;
}