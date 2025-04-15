'use client';

import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useAppStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { checkAvailability } from '@/lib/monitor';

export function StatusBar() {
  const { config, products, loading, lastChecked } = useAppStore();
  const { telegramConfig, checkIntervalSeconds, watchConfigs } = config;
  const [serverStatus, setServerStatus] = useState<{
    running: boolean;
    lastCheck: string | null;
  } | null>(null);

  // 获取服务器端监控状态
  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        const response = await fetch('/api/monitor/status');
        if (response.ok) {
          const data = await response.json();
          setServerStatus({
            running: data.running,
            lastCheck: data.lastCheck
          });
        }
      } catch (error) {
        console.error('获取服务器状态失败:', error);
      }
    };

    // 初始获取状态
    fetchServerStatus();

    // 每30秒更新一次状态
    const interval = setInterval(fetchServerStatus, 30000);

    return () => clearInterval(interval);
  }, []);

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
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">状态:</span>
          <span className={`inline-block w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
          <span className="text-sm">{loading ? '检查中...' : '就绪'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">服务器监控:</span>
          <span className={`inline-block w-2 h-2 rounded-full ${serverStatus?.running ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm">{serverStatus?.running ? '运行中' : '已停止'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">监控项:</span>
          <span className="text-sm">{enabledWatchConfigsCount} 个已启用</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">产品:</span>
          <span className="text-sm">{products.length} 个</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">上次检查:</span>
          <span className="text-sm">{lastChecked ? formatDate(lastChecked) : '从未'}</span>
        </div>

        {serverStatus?.lastCheck && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">服务器上次检查:</span>
            <span className="text-sm">{formatDate(serverStatus.lastCheck)}</span>
          </div>
        )}
      </div>
      
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