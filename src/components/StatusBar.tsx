'use client';

import React from 'react';
import { Button } from './ui/button';
import { useAppStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { checkAvailability } from '@/lib/monitor';

export function StatusBar() {
  const { config, lastChecked, loading, products } = useAppStore();
  const { telegramConfig, checkIntervalSeconds, watchConfigs } = config;
  
  const handleManualCheck = async () => {
    if (loading) return;
    await checkAvailability();
  };
  
  // 计算启用的监控项数量
  const enabledWatchConfigsCount = watchConfigs.filter(wc => wc.enabled).length;
  
  const getStatusText = () => {
    const parts = [];
    
    if (telegramConfig.enabled) {
      parts.push('Telegram通知已启用');
    } else {
      parts.push('Telegram通知未启用');
    }
    
    parts.push(`检查间隔: ${checkIntervalSeconds}秒`);
    parts.push(`监控项: ${enabledWatchConfigsCount}/${watchConfigs.length}个`);
    
    if (lastChecked) {
      parts.push(`上次检查: ${formatDate(lastChecked)}`);
    }
    
    return parts.join(' | ');
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
      <div className="text-sm text-gray-600">{getStatusText()}</div>
      
      <Button 
        onClick={handleManualCheck} 
        disabled={loading}
        size="sm"
      >
        {loading ? '检查中...' : '立即检查'}
      </Button>
    </div>
  );
} 