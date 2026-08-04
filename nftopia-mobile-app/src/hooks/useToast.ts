import { useToastStore } from '@/stores/toastStore';
import { ToastType, ToastPosition } from '@/stores/toastStore';

export function useToast() {
  const {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAlert,
    dismissToast,
    dismissAllToasts,
    dismissAlert,
    dismissAllAlerts,
  } = useToastStore();

  return {
    showToast: (
      message: string,
      type?: ToastType,
      duration?: number,
      position?: ToastPosition,
      action?: { label: string; onPress: () => void },
      dismissible?: boolean
    ) => showToast(message, type, duration, position, action, dismissible),
    
    showSuccess: (message: string, duration?: number) => 
      showSuccess(message, duration),
    
    showError: (message: string, duration?: number) => 
      showError(message, duration),
    
    showWarning: (message: string, duration?: number) => 
      showWarning(message, duration),
    
    showInfo: (message: string, duration?: number) => 
      showInfo(message, duration),
    
    showAlert: (
      title: string,
      message: string,
      actions: { label: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }[],
      type?: ToastType,
      dismissible?: boolean
    ) => showAlert(title, message, actions, type, dismissible),
    
    dismissToast,
    dismissAllToasts,
    dismissAlert,
    dismissAllAlerts,
  };
}