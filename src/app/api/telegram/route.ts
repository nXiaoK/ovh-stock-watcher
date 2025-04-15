import { NextResponse } from 'next/server';
import { TelegramConfig, OvhProduct } from '@/types';
import { isDatacenterAvailable } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      telegramConfig, 
      product, 
      datacenterIndex, 
      singleDatacenterOnly,
      currentTime,
      timeInterval,
      previousStatus
    } = body as {
      telegramConfig: TelegramConfig;
      product: OvhProduct;
      datacenterIndex: number;
      singleDatacenterOnly: boolean;
      currentTime: string;
      timeInterval: string | null;
      previousStatus: string | null;
    };

    // 检查配置是否有效
    if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
      return NextResponse.json(
        { success: false, error: 'Telegram 配置无效' },
        { status: 400 }
      );
    }

    const datacenter = product.datacenters[datacenterIndex];
    const currentAvailability = datacenter.availability;
    const isCurrentlyAvailable = isDatacenterAvailable(currentAvailability);
    
    // 可用性状态变更信息
    let statusChangeInfo = '';
    if (previousStatus !== null) {
      const wasAvailable = isDatacenterAvailable(previousStatus);
      if (isCurrentlyAvailable && !wasAvailable) {
        statusChangeInfo = `✅ 状态变更: 不可用 → 可用`;
      } else if (!isCurrentlyAvailable && wasAvailable) {
        statusChangeInfo = `❌ 状态变更: 可用 → 不可用`;
      } else {
        statusChangeInfo = `🔄 状态变更: ${previousStatus} → ${currentAvailability}`;
      }
    }
    
    // 时间信息
    const formattedTime = formatDate(currentTime);
    let timeInfo = `🕒 通知时间: ${formattedTime}`;
    if (timeInterval) {
      timeInfo += `\n⏱️ 距上次变更: ${timeInterval}`;
    }
    
    let message = '';
    
    if (singleDatacenterOnly) {
      // 只显示单个数据中心的消息
      message = `
🔔 *OVH服务器库存状态变更!*

*型号:* ${product.server}
*计划代码:* ${product.planCode}
*FQN:* ${product.fqn}
*内存:* ${product.memory}
*存储:* ${product.storage}
*系统存储:* ${product.systemStorage}
${product.gpu ? `*GPU:* ${product.gpu}` : ''}

*数据中心:* ${datacenter.datacenter}
*当前状态:* ${currentAvailability}

${statusChangeInfo}
${timeInfo}
      `;
    } else {
      // 显示完整产品信息的消息
      message = `
🔔 *OVH服务器库存状态变更!*

*型号:* ${product.server}
*计划代码:* ${product.planCode}
*FQN:* ${product.fqn}
*内存:* ${product.memory}
*存储:* ${product.storage}
*系统存储:* ${product.systemStorage}
${product.gpu ? `*GPU:* ${product.gpu}` : ''}

*数据中心:* ${datacenter.datacenter}
*当前状态:* ${currentAvailability}

${statusChangeInfo}
${timeInfo}
      `;
    }

    // 使用fetch直接调用Telegram API，避免使用Telegraf库
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramConfig.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      return NextResponse.json(
        { success: false, error: telegramData.description },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('发送Telegram通知失败:', error);
    return NextResponse.json(
      { success: false, error: '发送通知失败' },
      { status: 500 }
    );
  }
} 