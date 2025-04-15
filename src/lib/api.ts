'use client';

import axios from 'axios';
import { OvhProduct } from '@/types';

// 判断数据中心是否可用
export function isDatacenterAvailable(availability: string): boolean {
  return (
    availability !== 'unavailable' && 
    availability !== '' && 
    availability.toLowerCase() !== 'unknown'
  );
}

// 获取OVH产品列表
export async function fetchOvhProducts(): Promise<OvhProduct[]> {
  try {
    console.log('客户端开始从OVH API获取产品数据...');
    
    // 使用node-fetch或原生fetch
    const response = await fetch('https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`获取产品列表失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`客户端成功获取产品数据，共${data.length}个产品`);
    
    // 检查第一个产品的结构
    // if (data.length > 0) {
    //   console.log('客户端数据结构示例:', JSON.stringify(data[0], null, 2));
    // }
    
    // 确保数据是一个数组
    const productsArray = Array.isArray(data) ? data : [];
    
    // 处理产品数据，适配新的API格式
    const products: OvhProduct[] = productsArray.map((item: any, index: number) => {
      // 创建产品对象，确保所有必需字段都有值
      const product = {
        fqn: item.fqn || `product-${index}`,
        planCode: item.planCode || `product-${index}`,
        server: item.server || `product-${index}`,
        gpu: item.gpu || 'N/A',
        memory: item.memory || 'N/A',
        storage: item.storage || 'N/A',
        systemStorage: item.systemStorage || 'N/A',
        datacenters: (item.datacenters || []).map((dc: any) => ({
          datacenter: dc.datacenter || '',
          availability: dc.availability || 'unknown',
        })),
      };
      
      // 如果存在第一个产品，输出调试信息
      if (index === 0) {
        console.log('客户端转换后的产品示例:', JSON.stringify(product, null, 2));
      }
      
      return product;
    });

    // 检查是否有SK产品
    const skProducts = products.filter(p => p.planCode && p.planCode.toLowerCase().includes('sk'));
    console.log(`客户端API返回的产品中有${skProducts.length}个SK产品`);
    if (skProducts.length > 0) {
      console.log('客户端SK产品示例:', skProducts[0].planCode);
    }

    return products;
  } catch (error) {
    console.error('客户端获取OVH产品列表失败:', error);
    return [];
  }
}

export function filterAvailableProducts(products: OvhProduct[]): OvhProduct[] {
  return products.filter(product => 
    product.datacenters.some(dc => isDatacenterAvailable(dc.availability))
  );
}

// 过滤包含SK的商品
export function filterSKProducts(products: OvhProduct[]): OvhProduct[] {
  console.log('开始过滤SK产品，总产品数:', products.length);
  
  // 检查所有产品的planCode
  products.forEach(product => {
    console.log(`产品: ${product.server}, planCode: ${product.planCode}`);
  });
  
  // 使用更宽松的匹配条件
  console.log('---------->'+products.length)
  const skProducts = products.filter(product => {
    
    // 检查planCode是否包含sk
    const hasSKInPlanCode = product.planCode && product.planCode.toLowerCase().includes('sk');
    
    // 检查fqn是否包含sk
    const hasSKInFqn = product.fqn && product.fqn.toLowerCase().includes('sk');
    
    // 检查server是否包含sk
    const hasSKInServer = product.server && product.server.toLowerCase().includes('sk');
    
    // 如果任何一个字段包含sk，则认为是SK产品
    const isSKProduct = hasSKInPlanCode || hasSKInFqn || hasSKInServer;
    
    if (isSKProduct) {
      console.log(`找到SK产品: ${product.server}, planCode: ${product.planCode}, fqn: ${product.fqn}`);
    }
    
    return isSKProduct;
  });
  
  console.log('过滤后的SK产品数量:', skProducts.length);
  return skProducts;
}

export function matchesFilter(product: OvhProduct, filters: { fqn?: string; datacenter?: string }): boolean {
  if (filters.fqn && product.fqn !== filters.fqn) {
    return false;
  }
  
  if (filters.datacenter) {
    return product.datacenters.some(dc => 
      dc.datacenter.toLowerCase().includes(filters.datacenter!.toLowerCase()) &&
      isDatacenterAvailable(dc.availability)
    );
  }
  
  return true;
} 