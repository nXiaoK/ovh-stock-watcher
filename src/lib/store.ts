import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppConfig, AppState, WatchConfig } from '@/types';

// 生成UUID的兼容函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const defaultConfig: AppConfig = {
  telegramConfig: {
    enabled: false,
    botToken: '',
    chatId: ''
  },
  checkIntervalSeconds: 60,
  watchConfigs: []
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      products: [],
      loading: false,
      lastChecked: null,
      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config }
        })),
      addWatchConfig: (config) =>
        set((state) => ({
          config: {
            ...state.config,
            watchConfigs: [
              ...state.config.watchConfigs,
              { ...config, id: generateUUID() }
            ]
          }
        })),
      updateWatchConfig: (id, config) =>
        set((state) => ({
          config: {
            ...state.config,
            watchConfigs: state.config.watchConfigs.map((wc) =>
              wc.id === id ? { ...wc, ...config } : wc
            )
          }
        })),
      removeWatchConfig: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            watchConfigs: state.config.watchConfigs.filter((wc) => wc.id !== id)
          }
        })),
      setProducts: (products) => set({ products }),
      setLoading: (loading) => set({ loading }),
      setLastChecked: (date) => set({ lastChecked: date })
    }),
    {
      name: 'ovh-watcher-storage'
    }
  )
); 