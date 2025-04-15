'use client';

import React from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useAppStore } from '@/lib/store';
import { WatchConfig } from '@/types';

export function WatchList() {
  const { config, updateWatchConfig, removeWatchConfig } = useAppStore();
  const { watchConfigs } = config;

  if (watchConfigs.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow text-center">
        <p className="text-gray-500">尚未添加任何监控项</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">监控列表</h3>
      
      <div className="space-y-3">
        {watchConfigs.map((watchConfig) => (
          <WatchItem
            key={watchConfig.id}
            watchConfig={watchConfig}
            onToggle={(enabled) => updateWatchConfig(watchConfig.id, { enabled })}
            onRemove={() => removeWatchConfig(watchConfig.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface WatchItemProps {
  watchConfig: WatchConfig;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}

function WatchItem({ watchConfig, onToggle, onRemove }: WatchItemProps) {
  const { productFilters, enabled, notifyOnAvailability } = watchConfig;
  
  const getFilterSummary = () => {
    const parts = [];
    
    if (productFilters.fqn) {
      parts.push(`FQN: ${productFilters.fqn}`);
    }
    
    if (productFilters.datacenter) {
      parts.push(`数据中心: ${productFilters.datacenter}`);
    }
    
    return parts.join(', ');
  };
  
  return (
    <div className={`p-3 rounded-lg border ${enabled ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="text-sm font-medium">{getFilterSummary()}</div>
          <div className="text-xs text-gray-500">
            {notifyOnAvailability ? '有库存时通知' : '仅新上架/状态变更时通知'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch checked={enabled} onCheckedChange={onToggle} />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  );
} 