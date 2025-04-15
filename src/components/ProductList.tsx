'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { OvhProduct } from '@/types';
import { formatAvailability } from '@/lib/utils';
import { Button } from './ui/button';
import { filterSKProducts, isDatacenterAvailable } from '@/lib/api';
import { PlusCircle } from 'lucide-react';

export function ProductList() {
  const { products, loading, addWatchConfig } = useAppStore();
  
  // 添加调试日志
  useEffect(() => {
    console.log('ProductList组件渲染，产品数量:', products.length);
    if (products.length > 0) {
      console.log('第一个产品:', products[0]);
    }
  }, [products]);
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        <p>加载中...</p>
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">暂无产品数据</p>
      </div>
    );
  }
  
  // 筛选包含SK的产品，但不再筛选可用性
  const skProducts = filterSKProducts(products);
  console.log('ProductList中过滤后的SK产品数量:', skProducts.length);
  
  if (skProducts.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">暂无SK产品</p>
        <p className="text-sm text-gray-400 mt-2">总产品数: {products.length}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">SK产品（{skProducts.length}）</h3>
      
      <div className="space-y-3">
        {skProducts.map((product, index) => (
          <ProductItem 
            key={`${product.fqn}-${index}`} 
            product={product} 
            onAddToWatch={addWatchConfig}
          />
        ))}
      </div>
    </div>
  );
}

interface ProductItemProps {
  product: OvhProduct;
  onAddToWatch: (config: { enabled: boolean; productFilters: { fqn?: string; datacenter?: string; }; notifyOnAvailability: boolean; }) => void;
}

function ProductItem({ product, onAddToWatch }: ProductItemProps) {
  // 显示所有数据中心，不再筛选可用性
  const allDatacenters = product.datacenters;
  // 但仍然计算有多少可用的数据中心，用于显示信息
  const availableDatacentersCount = allDatacenters.filter(dc => isDatacenterAvailable(dc.availability)).length;
  
  const handleAddToWatch = () => {
    onAddToWatch({
      enabled: true,
      productFilters: {
        fqn: product.fqn,
      },
      notifyOnAvailability: false, // 设置为false，仅状态变更通知
    });
    alert(`已添加监控：${product.server} (${product.fqn})`);
  };
  
  const handleAddDatacenterToWatch = (datacenter: string) => {
    onAddToWatch({
      enabled: true,
      productFilters: {
        fqn: product.fqn,
        datacenter: datacenter,
      },
      notifyOnAvailability: false, // 设置为false，仅状态变更通知
    });
    alert(`已添加监控：${product.server} (${product.fqn}) - ${datacenter}`);
  };
  
  // 显示所有产品，即使没有可用数据中心
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="font-medium">{product.server}</span>
          <span className="text-sm text-gray-500">{product.planCode}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-gray-600">FQN:</span> {product.fqn}
        </div>
        
        <div className="text-sm">
          <span className="text-gray-600">内存:</span> {product.memory}
          {product.gpu && <span className="ml-2 text-gray-600">GPU:</span>} {product.gpu}
        </div>
        
        <div className="text-sm">
          <span className="text-gray-600">存储:</span> {product.storage}
          <span className="ml-2 text-gray-600">系统存储:</span> {product.systemStorage}
        </div>
        
        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <Button 
            onClick={handleAddToWatch}
            variant="outline"
            size="sm"
            className="text-blue-500 border-blue-300 hover:bg-blue-50"
          >
            监控所有数据中心
          </Button>
        </div>
        
        <div className="mt-2 pt-2 border-t">
          <div className="text-sm font-medium">
            所有数据中心 ({allDatacenters.length}个) - 可用: {availableDatacentersCount}个
          </div>
          <div className="mt-1 space-y-1">
            {allDatacenters.map((dc, index) => {
              const isAvailable = isDatacenterAvailable(dc.availability);
              return (
                <div 
                  key={index} 
                  className={`text-sm flex justify-between items-center p-2 rounded ${
                    isAvailable ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{dc.datacenter}</span>
                    <span className={isAvailable ? 'text-green-600' : 'text-gray-500'}>
                      {formatAvailability(dc.availability)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:bg-blue-50 p-1 h-auto"
                    onClick={() => handleAddDatacenterToWatch(dc.datacenter)}
                    title={`监控此数据中心: ${dc.datacenter}`}
                  >
                    <PlusCircle size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 