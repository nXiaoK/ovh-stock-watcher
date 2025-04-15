import { NextResponse } from 'next/server';
import { OvhProduct } from '@/types';
import axios from 'axios';

const API_URL = 'https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities';

async function fetchOvhProductsFromAPI(): Promise<OvhProduct[]> {
  try {
    const response = await axios.get<OvhProduct[]>(API_URL, {
      headers: {
        'accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching OVH products:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const products = await fetchOvhProductsFromAPI();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching OVH products:', error);
    return NextResponse.json(
      { error: '获取OVH产品失败' },
      { status: 500 }
    );
  }
} 