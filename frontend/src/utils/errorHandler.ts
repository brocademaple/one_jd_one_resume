import { useToastStore } from '../store/useToastStore';

export function handleApiError(error: unknown, customMessage?: string) {
  const addToast = useToastStore.getState().addToast;

  let message = customMessage || '操作失败';

  if (error instanceof Error) {
    message = customMessage ? `${customMessage}: ${error.message}` : error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  addToast({
    type: 'error',
    message,
    duration: 4000
  });

  console.error('API Error:', error);
}

export function showSuccess(message: string) {
  const addToast = useToastStore.getState().addToast;
  addToast({
    type: 'success',
    message,
    duration: 3000
  });
}

export function showInfo(message: string) {
  const addToast = useToastStore.getState().addToast;
  addToast({
    type: 'info',
    message,
    duration: 3000
  });
}

export function showWarning(message: string) {
  const addToast = useToastStore.getState().addToast;
  addToast({
    type: 'warning',
    message,
    duration: 3000
  });
}
