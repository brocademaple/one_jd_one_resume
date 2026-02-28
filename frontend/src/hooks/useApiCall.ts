import { useState, useCallback } from 'react';
import { handleApiError, showSuccess } from '../utils/errorHandler';

interface UseApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useApiCall<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  options: UseApiCallOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);

        if (options.successMessage) {
          showSuccess(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        handleApiError(err, options.errorMessage);

        if (options.onError) {
          options.onError(err);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, options]
  );

  return { execute, loading, error };
}
