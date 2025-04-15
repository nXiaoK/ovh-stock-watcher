'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { initMonitorService, startServerMonitoring, stopServerMonitoring, getServerMonitoringStatus, updateTestProductAvailability } from '@/lib/monitor';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const { config } = useAppStore();
  const [testMode, setTestMode] = useState(false);

  // 初始化监控服务
  useEffect(() => {
    // 获取服务器端监控状态
    getServerMonitoringStatus().then(status => {
      console.log('已获取服务器端监控状态');
      
      // 初始化监控服务并获取清理函数
      const cleanup = initMonitorService();
      
      // 启动服务器端监控
      startServerMonitoring(testMode);
      
      // 组件卸载时清理
      return () => {
        cleanup();
        // 停止服务器端监控
        stopServerMonitoring();
      };
    });
  }, [config.checkIntervalSeconds, testMode]);

  // 测试模式切换函数
  const toggleTestMode = async () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    
    // 停止当前监控
    stopServerMonitoring();
    
    // 使用新的测试模式状态启动监控
    await startServerMonitoring(newTestMode);
  };

  // 测试产品可用性变化函数
  const testAvailabilityChange = async (availability: string) => {
    if (!testMode) {
      console.error('测试模式未启用，无法更改产品可用性');
      return;
    }
    
    await updateTestProductAvailability(availability);
  };

  return (
    <>
      {children}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
          <h3 className="text-lg font-bold mb-2">测试模式</h3>
          <div className="flex items-center mb-2">
            <label className="mr-2">启用测试模式:</label>
            <input 
              type="checkbox" 
              checked={testMode} 
              onChange={toggleTestMode}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
          </div>
          {testMode && (
            <div className="mt-2">
              <h4 className="font-semibold mb-1">24sk10-sgp (GRA) 可用性:</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => testAvailabilityChange('available')}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm"
                >
                  设为可用
                </button>
                <button 
                  onClick={() => testAvailabilityChange('unavailable')}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm"
                >
                  设为不可用
                </button>
                <button 
                  onClick={() => testAvailabilityChange('120H')}
                  className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-sm"
                >
                  设为120小时
                </button>
                <button 
                  onClick={() => testAvailabilityChange('24H')}
                  className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-sm"
                >
                  设为24小时
                </button>
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-300">
            <p>测试指定产品: 24sk10-sgp.ram-32g-ecc-2133.softraid-2x480ssd</p>
            <p>测试指定数据中心: GRA</p>
          </div>
        </div>
      )}
    </>
  );
} 