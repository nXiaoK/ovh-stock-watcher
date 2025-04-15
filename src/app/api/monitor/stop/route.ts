import { NextResponse } from 'next/server';

// 停止监控API
export async function POST() {
  try {
    // 获取监控服务实例
    const monitorModule = await import('../start/route');
    
    // 停止监控服务
    if (typeof monitorModule.stopMonitoring === 'function') {
      monitorModule.stopMonitoring();
      return NextResponse.json({ success: true, message: '监控服务已停止' });
    } else {
      return NextResponse.json(
        { success: false, error: '监控服务未找到' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('停止监控服务失败:', error);
    return NextResponse.json(
      { success: false, error: '停止监控服务失败' },
      { status: 500 }
    );
  }
} 