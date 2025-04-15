'use client';

import { OvhProduct, TelegramConfig } from '@/types';

export async function sendNotification(
  config: TelegramConfig, 
  product: OvhProduct, 
  datacenterIndex: number,
  singleDatacenterOnly: boolean = false,
  currentTime: string = new Date().toISOString(),
  timeInterval: string | null = null,
  previousStatus: string | null = null
): Promise<boolean> {
  if (!config.enabled || !config.botToken || !config.chatId) {
    return false;
  }

  try {
    // 使用API端点发送Telegram通知
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegramConfig: config,
        product,
        datacenterIndex,
        singleDatacenterOnly,
        currentTime,
        timeInterval,
        previousStatus
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
} 