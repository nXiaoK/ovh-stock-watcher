'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { checkAvailability } from '@/lib/monitor';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const { config } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化轮询
  useEffect(() => {
    const { checkIntervalSeconds } = config;
    
    // 清除之前的轮询
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // 初次加载立即检查一次
    checkAvailability();
    
    // 设置新的轮询
    const intervalMs = checkIntervalSeconds * 1000;
    intervalRef.current = setInterval(checkAvailability, intervalMs);
    
    // 组件卸载时清除轮询
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config.checkIntervalSeconds]);

  return <>{children}</>;
} 