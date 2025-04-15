export interface DatacenterStatusHistory {
  datacenter: string;
  availability: string;
  timestamp: string; // ISO 日期字符串
}

export interface Datacenter {
  availability: string;
  datacenter: string;
}

export interface OvhProduct {
  datacenters: Datacenter[];
  fqn: string;
  gpu: string;
  memory: string;
  planCode: string;
  server: string;
  storage: string;
  systemStorage: string;
}

export interface WatchConfig {
  id: string;
  enabled: boolean;
  productFilters: {
    fqn?: string;
    datacenter?: string;
  };
  notifyOnAvailability: boolean;
  statusHistory?: {
    [datacenterName: string]: DatacenterStatusHistory[];
  };
  lastNotification?: string; // ISO 日期字符串
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface AppConfig {
  telegramConfig: TelegramConfig;
  checkIntervalSeconds: number;
  watchConfigs: WatchConfig[];
}

export type AppState = {
  config: AppConfig;
  products: OvhProduct[];
  loading: boolean;
  lastChecked: string | null;
  updateConfig: (config: Partial<AppConfig>) => void;
  addWatchConfig: (config: Omit<WatchConfig, "id">) => void;
  updateWatchConfig: (id: string, config: Partial<WatchConfig>) => void;
  removeWatchConfig: (id: string) => void;
  setProducts: (products: OvhProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setLastChecked: (date: string) => void;
}; 