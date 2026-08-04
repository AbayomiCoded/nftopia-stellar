import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom' | 'center';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onPress: () => void;
  };
  dismissible?: boolean;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type?: ToastType;
  actions: {
    label: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
  dismissible?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  alerts: Alert[];
  maxToasts: number;

  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    position?: ToastPosition,
    action?: Toast['action'],
    dismissible?: boolean
  ) => string;
  
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  
  showAlert: (
    title: string,
    message: string,
    actions: Alert['actions'],
    type?: ToastType,
    dismissible?: boolean
  ) => string;
  
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  dismissAlert: (id: string) => void;
  dismissAllAlerts: () => void;
  clearAll: () => void;
}

const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  alerts: [],
  maxToasts: 5,

  showToast: (
    message: string,
    type: ToastType = 'info',
    duration: number = 3000,
    position: ToastPosition = 'top',
    action?: Toast['action'],
    dismissible: boolean = true
  ) => {
    const id = generateId();
    const { toasts, maxToasts } = get();

    // Remove oldest toast if at max
    let newToasts = [{ id, message, type, duration, position, action, dismissible }, ...toasts];
    if (newToasts.length > maxToasts) {
      newToasts = newToasts.slice(0, maxToasts);
    }

    set({ toasts: newToasts });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  showSuccess: (message: string, duration: number = 3000) => {
    return get().showToast(message, 'success', duration);
  },

  showError: (message: string, duration: number = 4000) => {
    return get().showToast(message, 'error', duration);
  },

  showWarning: (message: string, duration: number = 3500) => {
    return get().showToast(message, 'warning', duration);
  },

  showInfo: (message: string, duration: number = 3000) => {
    return get().showToast(message, 'info', duration);
  },

  showAlert: (
    title: string,
    message: string,
    actions: Alert['actions'],
    type: ToastType = 'info',
    dismissible: boolean = true
  ) => {
    const id = generateId();
    set((state) => ({
      alerts: [...state.alerts, { id, title, message, type, actions, dismissible }],
    }));
    return id;
  },

  dismissToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  dismissAllToasts: () => {
    set({ toasts: [] });
  },

  dismissAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  dismissAllAlerts: () => {
    set({ alerts: [] });
  },

  clearAll: () => {
    set({ toasts: [], alerts: [] });
  },
}));