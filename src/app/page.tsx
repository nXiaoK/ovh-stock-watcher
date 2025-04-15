'use client';

import { useEffect } from 'react';
import { AddWatchForm } from "@/components/AddWatchForm";
import { ConfigForm } from "@/components/ConfigForm";
import { ProductList } from "@/components/ProductList";
import { StatusBar } from "@/components/StatusBar";
import { WatchList } from "@/components/WatchList";
import { useAppStore } from '@/lib/store';
import { fetchOvhProducts } from '@/lib/api';

export default function Home() {
  const { setProducts, setLoading, setLastChecked } = useAppStore();

  // 初始化加载产品列表
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const products = await fetchOvhProducts();
        setProducts(products);
        setLastChecked(new Date().toISOString());
      } catch (error) {
        console.error('加载产品列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <header className="mb-6 text-center py-6">
          <h1 className="text-2xl font-bold">OVH服务器库存监控</h1>
          <p className="text-gray-600 mt-1">实时监控OVH服务器库存并通过Telegram发送通知</p>
        </header>
        
        <div className="mb-6">
          <StatusBar />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-1">
            <ConfigForm />
            <AddWatchForm />
          </div>
          
          <div className="space-y-6 lg:col-span-2">
            <WatchList />
            <ProductList />
          </div>
        </div>
      </div>
    </main>
  );
}
