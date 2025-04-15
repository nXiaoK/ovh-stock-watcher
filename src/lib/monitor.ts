'use client';

import { fetchOvhProducts, matchesFilter, isDatacenterAvailable } from './api';
import { sendNotification } from './telegram';
import { useAppStore } from './store';
import { DatacenterStatusHistory, OvhProduct, WatchConfig } from '@/types';

// 存储上次检查时的产品状态
let previousProducts: OvhProduct[] = [];

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