'use client';

import { fetchOvhProducts, matchesFilter, isDatacenterAvailable } from './api';
import { sendNotification } from './telegram';
import { useAppStore } from './store';
import { DatacenterStatusHistory, OvhProduct, WatchConfig } from '@/types';

// 存储上次检查时的产品状态
let previousProducts: OvhProduct[] = [];
// 存储定时器ID
let monitorInterval: NodeJS.Timeout | null = null;

// 初始化监控服务
export function initMonitorService() {
  // 如果已经有定时器在运行，先清除
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  
  // 立即执行一次检查
  checkAvailability();
  
  // 获取当前配置
  const { config } = useAppStore.getState();
  
  // 设置新的定时器
  const intervalMs = config.checkIntervalSeconds * 1000;
  monitorInterval = setInterval(checkAvailability, intervalMs);
  
  // 返回清理函数
  return () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
  };
}

// 获取服务器端监控状态
export async function getServerMonitoringStatus() {
  try {
    const response = await fetch('/api/monitor/status');
    if (!response.ok) {
      throw new Error('获取监控状态失败');
    }
    
    const data = await response.json();
    console.log('服务器端监控状态:', data);
    
    // 如果服务器端有配置，则更新客户端配置
    if (data.config) {
      const { config: clientConfig, updateConfig } = useAppStore.getState();
      
      // 检查是否需要更新客户端配置
      const needsUpdate = 
        // 监控配置为空
        clientConfig.watchConfigs.length === 0 && data.config.watchConfigs.length > 0 ||
        // Telegram配置为空但服务器端有
        (!clientConfig.telegramConfig.enabled && data.config.telegramConfig.enabled);
      
      if (needsUpdate) {
        console.log('从服务器同步配置到客户端');
        
        // 保留客户端的Telegram配置（如果有）
        const telegramConfig = clientConfig.telegramConfig.enabled ? 
          clientConfig.telegramConfig : 
          data.config.telegramConfig;
        
        // 更新配置
        updateConfig({
          ...clientConfig,
          watchConfigs: data.config.watchConfigs,
          telegramConfig: telegramConfig
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('获取服务器监控状态错误:', error);
    return null;
  }
}

// 启动服务器端监控
export async function startServerMonitoring(testMode: boolean = false) {
  try {
    // 获取当前配置
    const { config } = useAppStore.getState();
    
    // 构建URL，添加测试模式参数
    const url = testMode ? '/api/monitor/start?testMode=true' : '/api/monitor/start';
    
    // 调用API启动服务器端监控
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('启动服务器监控失败');
    }
    
    const data = await response.json();
    console.log('服务器端监控已启动', data);
    return true;
  } catch (error) {
    console.error('启动服务器监控错误:', error);
    return false;
  }
}

// 停止服务器端监控
export async function stopServerMonitoring() {
  try {
    // 调用API停止服务器端监控
    const response = await fetch('/api/monitor/stop', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('停止服务器监控失败');
    }
    
    return true;
  } catch (error) {
    console.error('停止服务器监控错误:', error);
    return false;
  }
}

export async function checkAvailability() {
  const { 
    config, 
    setProducts, 
    setLoading, 
    setLastChecked,
    updateWatchConfig
  } = useAppStore.getState();

  if (config.watchConfigs.length === 0) {
    return;
  }

  try {
    setLoading(true);
    
    // 获取最新的产品信息
    const products = await fetchOvhProducts();
    setProducts(products);
    const currentTime = new Date().toISOString();
    setLastChecked(currentTime);
    
    // 处理通知
    await processNotifications(products, previousProducts, config.watchConfigs, config.telegramConfig, updateWatchConfig, currentTime);
    
    // 更新上次检查的产品信息
    previousProducts = [...products];
  } catch (error) {
    console.error('监控服务错误:', error);
  } finally {
    setLoading(false);
  }
}

async function processNotifications(
  currentProducts: OvhProduct[],
  prevProducts: OvhProduct[],
  watchConfigs: WatchConfig[],
  telegramConfig: { enabled: boolean; botToken: string; chatId: string },
  updateWatchConfig: (id: string, config: Partial<WatchConfig>) => void,
  currentTime: string
) {
  // 筛选启用的监控配置
  const enabledConfigs = watchConfigs.filter(config => config.enabled);
  
  if (enabledConfigs.length === 0 || !telegramConfig.enabled) {
    return;
  }

  // 对每个启用的监控配置进行处理
  for (const watchConfig of enabledConfigs) {
    // 初始化状态历史记录，如果不存在
    if (!watchConfig.statusHistory) {
      watchConfig.statusHistory = {};
    }

    // 检查该监控匹配的产品
    for (const product of currentProducts) {
      // 检查是否符合FQN条件
      if (watchConfig.productFilters.fqn && watchConfig.productFilters.fqn !== product.fqn) {
        continue; // 不匹配，跳过
      }

      // 找到之前的产品数据
      const prevProduct = prevProducts.find(p => p.fqn === product.fqn);

      // 检查每个数据中心
      for (let i = 0; i < product.datacenters.length; i++) {
        const datacenter = product.datacenters[i];
        const datacenterName = datacenter.datacenter;

        // 检查是否符合数据中心条件
        if (watchConfig.productFilters.datacenter && 
            !datacenterName.toLowerCase().includes(watchConfig.productFilters.datacenter.toLowerCase())) {
          continue; // 不匹配，跳过
        }

        // 获取该数据中心的历史记录
        if (!watchConfig.statusHistory[datacenterName]) {
          watchConfig.statusHistory[datacenterName] = [];
        }

        // 获取当前状态和上一次状态
        const currentStatus = datacenter.availability;
        const lastHistory = watchConfig.statusHistory[datacenterName].length > 0 ? 
                          watchConfig.statusHistory[datacenterName][watchConfig.statusHistory[datacenterName].length - 1] : null;
        const lastStatus = lastHistory ? lastHistory.availability : null;

        // 如果状态变化了或者是第一次记录
        if (currentStatus !== lastStatus) {
          // 添加新状态到历史记录
          const newHistory: DatacenterStatusHistory = {
            datacenter: datacenterName,
            availability: currentStatus,
            timestamp: currentTime
          };
          watchConfig.statusHistory[datacenterName].push(newHistory);

          // 保持历史记录不超过10条
          if (watchConfig.statusHistory[datacenterName].length > 10) {
            watchConfig.statusHistory[datacenterName].shift();
          }

          // 计算状态变更间隔时间
          let timeInterval = null;
          if (lastHistory) {
            const lastTime = new Date(lastHistory.timestamp).getTime();
            const currentTimeMs = new Date(currentTime).getTime();
            const intervalMs = currentTimeMs - lastTime;
            // 转换为可读格式
            timeInterval = formatTimeInterval(intervalMs);
          }

          // 仅当可用性状态发生变化时发送通知
          if (lastStatus !== null) {  // 确保不是第一次记录
            await sendNotification(
              telegramConfig, 
              product, 
              i, 
              watchConfig.productFilters.datacenter !== undefined,
              currentTime,
              timeInterval,
              lastStatus
            );

            // 更新最后通知时间
            watchConfig.lastNotification = currentTime;
          }

          // 更新监控配置，保存状态历史
          updateWatchConfig(watchConfig.id, {
            statusHistory: watchConfig.statusHistory,
            lastNotification: watchConfig.lastNotification
          });
        }
      }
    }
  }
}

// 格式化时间间隔
function formatTimeInterval(intervalMs: number): string {
  const seconds = Math.floor(intervalMs / 1000);
  
  // 只有秒
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  // 分和秒
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`;
  }
  
  // 时、分和秒
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`;
  }
  
  // 天、时和分
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`;
}

// 更新测试产品可用性
export async function updateTestProductAvailability(availability: string) {
  try {
    const response = await fetch('/api/monitor/start', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        availability
      }),
    });
    
    if (!response.ok) {
      throw new Error('更新测试产品可用性失败');
    }
    
    const data = await response.json();
    console.log('测试产品可用性已更新', data);
    return data;
  } catch (error) {
    console.error('更新测试产品可用性错误:', error);
    return null;
  }
} 