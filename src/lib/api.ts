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

export async function fetchOvhProducts(): Promise<OvhProduct[]> {
  try {
    // 使用相对路径调用本地API
    const response = await fetch('/api/ovh');
    if (!response.ok) {
      throw new Error('Failed to fetch OVH products');
    }
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error('Error fetching OVH products:', error);
    throw error;
  }
}

export function filterAvailableProducts(products: OvhProduct[]): OvhProduct[] {
  return products.filter(product => 
    product.datacenters.some(dc => isDatacenterAvailable(dc.availability))
  );
}

// 过滤包含SK的商品
export function filterSKProducts(products: OvhProduct[]): OvhProduct[] {
  return products.filter(product => 
    product.planCode.toLowerCase().includes('sk')
  );
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