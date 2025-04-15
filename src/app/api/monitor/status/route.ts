import { NextResponse } from 'next/server';

// 获取监控状态API
export async function GET() {
  try {
    // 获取监控服务实例
    const monitorModule = await import('../start/route');
    
    // 获取监控状态
    return NextResponse.json({
      running: monitorModule.monitorInterval !== null,
      config: monitorModule.currentConfig,
      lastCheck: monitorModule.previousProducts.length > 0 ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error('获取监控状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取监控状态失败' },
      { status: 500 }
    );
  }
} 