import { NextRequest, NextResponse } from 'next/server';
import { AppConfig } from '@/types';
import { DatacenterStatusHistory, OvhProduct, WatchConfig } from '@/types';
import fs from 'fs';
import path from 'path';

// 存储上次检查时的产品状态
let previousProducts: OvhProduct[] = [];
// 存储定时器ID
let monitorInterval: NodeJS.Timeout | null = null;
// 存储当前配置
let currentConfig: AppConfig | null = null;
// 存储状态历史
let statusHistory: Record<string, Record<string, DatacenterStatusHistory[]>> = {};
// 测试模式标志
let testMode: boolean = false;
// 测试模式下的产品状态
let testModeProducts: OvhProduct[] = [];

// 配置文件路径
const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'monitor-config.json');
const HISTORY_FILE_PATH = path.join(process.cwd(), 'data', 'monitor-history.json');

// 确保数据目录存在
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 保存配置到文件
function saveConfig(config: AppConfig) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
}

// 从文件加载配置
function loadConfig(): AppConfig | null {
  ensureDataDir();
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    } catch (error) {
      console.error('加载配置失败:', error);
      return null;
    }
  }
  return null;
}

// 保存历史记录到文件
function saveHistory(history: Record<string, Record<string, DatacenterStatusHistory[]>>) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));
}

// 从文件加载历史记录
function loadHistory(): Record<string, Record<string, DatacenterStatusHistory[]>> {
  ensureDataDir();
  if (fs.existsSync(HISTORY_FILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE_PATH, 'utf-8'));
    } catch (error) {
      console.error('加载历史记录失败:', error);
      return {};
    }
  }
  return {};
}

// 格式化时间间隔
function formatTimeInterval(intervalMs: number): string {
  const seconds = Math.floor(intervalMs / 1000);
  
  // 只有秒
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  // 分和秒
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`;
  }
  
  // 时、分和秒
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`;
  }
  
  // 天、时和分
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`;
}

// 生成模拟产品数据
function generateMockProducts(): OvhProduct[] {
  console.log('生成模拟产品数据');
  return [
    {
      fqn: "baremetal_ab-2-14",
      planCode: "baremetal_ab-2-14",
      server: "AB-2-14",
      gpu: "N/A",
      memory: "32GB",
      storage: "2x480GB SSD",
      systemStorage: "2x480GB SSD",
      datacenters: [
        { datacenter: "bhs1", availability: "available" },
        { datacenter: "gra1", availability: "unavailable" },
        { datacenter: "sbg1", availability: "available" }
      ]
    },
    {
      fqn: "baremetal_ab-2-16",
      planCode: "baremetal_ab-2-16",
      server: "AB-2-16",
      gpu: "N/A",
      memory: "64GB",
      storage: "2x480GB SSD",
      systemStorage: "2x480GB SSD",
      datacenters: [
        { datacenter: "bhs1", availability: "unavailable" },
        { datacenter: "gra1", availability: "available" },
        { datacenter: "sbg1", availability: "unavailable" }
      ]
    }
  ];
}

// 生成测试产品数据
function generateTestProducts(): OvhProduct[] {
  console.log('生成测试产品数据');
  
  // 创建一些测试产品
  const products: OvhProduct[] = [
    {
      fqn: "24sk10.ram-32g-ecc-2133.softraid-2x2000sa",
      planCode: "24sk10-sgp",
      server: "SK Server 24sk10-sgp",
      gpu: "NA",
      memory: "32GB-ECC-2133",
      storage: "2x480GB SSD SoftRAID",
      systemStorage: "2x480GB SSD",
      datacenters: [
        { datacenter: "gra1", availability: "available" },
        { datacenter: "bhs1", availability: "unavailable" },
        { datacenter: "sgp1", availability: "120H" }
      ]
    },
    {
      fqn: "test-product-2",
      planCode: "test-sk-2",
      server: "Test SK Server 2",
      gpu: "NVIDIA A100",
      memory: "256GB",
      storage: "4x1.92TB NVMe",
      systemStorage: "2x480GB SSD",
      datacenters: [
        { datacenter: "gra1", availability: "unavailable" },
        { datacenter: "bhs1", availability: "available" },
        { datacenter: "sgp1", availability: "unavailable" }
      ]
    }
  ];
  
  return products;
}

// 获取OVH产品列表（服务器端版本）
async function fetchOvhProductsServer(): Promise<OvhProduct[]> {
  try {
    // 如果是测试模式，返回测试数据
    if (testMode) {
      console.log('测试模式：使用模拟产品数据');
      return testModeProducts;
    }
    
    console.log('开始从OVH API获取产品数据...');
    
    // 使用全局fetch
    const response = await fetch('https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 0 } // 禁用缓存
    });

    if (!response.ok) {
      throw new Error(`获取产品列表失败: ${response.status} ${response.statusText}`);
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`成功获取产品数据，共${data.length}个产品`);
      
      // 调试第一个产品的结构
      // if (data.length > 0) {
      //   console.log('数据结构示例:', JSON.stringify(data[0], null, 2));
      // }
    } else {
      const text = await response.text();
      console.error('API返回了非JSON格式的响应:', text.substring(0, 100) + '...');
      throw new Error('API返回了非JSON格式的响应');
    }
    
    // 处理新的API返回格式
    console.log('API返回格式是否为数组:', Array.isArray(data));
    
    // 确保数据是一个数组
    const productsArray = Array.isArray(data) ? data : [];
    
    // 处理产品数据
    const products: OvhProduct[] = productsArray.map((item: Record<string, unknown>, index: number) => {
      // 创建产品对象，适配新的API格式
      const product = {
        fqn: item.fqn as string || `product-${index}`,
        planCode: item.planCode as string || `product-${index}`,
        server: item.server as string || `product-${index}`,
        gpu: item.gpu as string || 'N/A',
        memory: item.memory as string || 'N/A',
        storage: item.storage as string || 'N/A',
        systemStorage: item.systemStorage as string || 'N/A',
        datacenters: ((item.datacenters as Record<string, unknown>[] || []).map((dc: Record<string, unknown>) => ({
          datacenter: dc.datacenter as string || '',
          availability: dc.availability as string || 'unknown',
        }))),
      };
      
      return product;
    });

    // 如果启用了测试模式，修改特定产品的可用性
    if (testMode && testModeProducts.length > 0) {
      // 查找指定FQN的产品
      const targetFQN = "24sk10.ram-32g-ecc-2133.softraid-2x2000sa";
      const targetProduct = products.find(p => p.fqn === targetFQN);
      
      if (targetProduct) {
        console.log(`找到目标测试产品: ${targetFQN}`);
        
        // 查找gra数据中心
        const graDatacenterIndex = targetProduct.datacenters.findIndex(
          dc => dc.datacenter.toLowerCase().includes('gra')
        );
        
        if (graDatacenterIndex >= 0) {
          console.log(`找到gra数据中心，索引: ${graDatacenterIndex}`);
          
          // 获取测试模式下的可用性设置
          const testProduct = testModeProducts[0];
          const testDatacenter = testProduct.datacenters.find(
            dc => dc.datacenter.toLowerCase().includes('gra')
          );
          
          if (testDatacenter) {
            // 修改可用性
            const oldAvailability = targetProduct.datacenters[graDatacenterIndex].availability;
            targetProduct.datacenters[graDatacenterIndex].availability = testDatacenter.availability;
            
            console.log(`测试模式：修改产品 ${targetFQN} 的gra数据中心可用性从 ${oldAvailability} 为 ${testDatacenter.availability}`);
          }
        } else {
          console.log(`未找到gra数据中心`);
        }
      } else {
        console.log(`未找到目标测试产品: ${targetFQN}`);
      }
    }

    return products;
  } catch (error) {
    console.error('获取OVH产品列表失败:', error);
    
    // 尝试使用备用方式获取产品数据
    try {
      console.log('尝试使用备用方法获取产品数据...');
      // 如果之前已经获取过产品，就返回上次的产品列表
      if (previousProducts.length > 0) {
        console.log('使用上次缓存的产品数据');
        return previousProducts;
      }
      
      // 如果没有缓存的产品数据，使用模拟数据
      console.log('使用模拟产品数据');
      return generateMockProducts();
    } catch (backupError) {
      console.error('备用方法失败:', backupError);
      return generateMockProducts();
    }
  }
}

// 处理通知
async function processNotifications(
  currentProducts: OvhProduct[],
  prevProducts: OvhProduct[],
  watchConfigs: WatchConfig[],
  telegramConfig: { enabled: boolean; botToken: string; chatId: string },
  currentTime: string
) {
  // 筛选启用的监控配置
  const enabledConfigs = watchConfigs.filter(config => config.enabled);
  
  if (enabledConfigs.length === 0 || !telegramConfig.enabled) {
    return;
  }

  // 对每个启用的监控配置进行处理
  for (const watchConfig of enabledConfigs) {
    // 初始化状态历史记录，如果不存在
    if (!statusHistory[watchConfig.id]) {
      statusHistory[watchConfig.id] = {};
    }

    // 检查该监控匹配的产品
    for (const product of currentProducts) {
      // 检查是否符合FQN条件
      if (watchConfig.productFilters.fqn && watchConfig.productFilters.fqn !== product.fqn) {
        continue; // 不匹配，跳过
      }

      // 检查每个数据中心
      for (let i = 0; i < product.datacenters.length; i++) {
        const datacenter = product.datacenters[i];
        const datacenterName = datacenter.datacenter;

        // 检查是否符合数据中心条件
        if (watchConfig.productFilters.datacenter && 
            !datacenterName.toLowerCase().includes(watchConfig.productFilters.datacenter.toLowerCase())) {
          continue; // 不匹配，跳过
        }

        // 获取该数据中心的历史记录
        if (!statusHistory[watchConfig.id][datacenterName]) {
          statusHistory[watchConfig.id][datacenterName] = [];
        }

        // 获取当前状态和上一次状态
        const currentStatus = datacenter.availability;
        const lastHistory = statusHistory[watchConfig.id][datacenterName].length > 0 ? 
                          statusHistory[watchConfig.id][datacenterName][statusHistory[watchConfig.id][datacenterName].length - 1] : null;
        const lastStatus = lastHistory ? lastHistory.availability : null;

        // 如果状态变化了或者是第一次记录
        if (currentStatus !== lastStatus) {
          // 添加新状态到历史记录
          const newHistory: DatacenterStatusHistory = {
            datacenter: datacenterName,
            availability: currentStatus,
            timestamp: currentTime
          };
          statusHistory[watchConfig.id][datacenterName].push(newHistory);

          // 保持历史记录不超过10条
          if (statusHistory[watchConfig.id][datacenterName].length > 10) {
            statusHistory[watchConfig.id][datacenterName].shift();
          }

          // 计算状态变更间隔时间
          let timeInterval = null;
          if (lastHistory) {
            const lastTime = new Date(lastHistory.timestamp).getTime();
            const currentTimeMs = new Date(currentTime).getTime();
            const intervalMs = currentTimeMs - lastTime;
            // 转换为可读格式
            timeInterval = formatTimeInterval(intervalMs);
          }

          // 仅当可用性状态发生变化时发送通知
          if (lastStatus !== null) {  // 确保不是第一次记录
            // 使用API端点发送通知，而不是直接调用客户端函数
            try {
              // 在服务器端，需要使用完整的URL
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const response = await fetch(`${baseUrl}/api/telegram`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  telegramConfig,
                  product,
                  datacenterIndex: i,
                  singleDatacenterOnly: watchConfig.productFilters.datacenter !== undefined,
                  currentTime,
                  timeInterval,
                  previousStatus: lastStatus
                }),
              });
              
              const data = await response.json();
              console.log('Telegram通知发送结果:', data);
            } catch (error) {
              console.error('发送Telegram通知失败:', error);
            }

            // 更新最后通知时间
            watchConfig.lastNotification = currentTime;
          }

          // 保存历史记录
          saveHistory(statusHistory);
        }
      }
    }
  }
}

// 检查可用性
async function checkAvailability() {
  if (!currentConfig) {
    return;
  }

  try {
    // 获取最新的产品信息
    const products = await fetchOvhProductsServer();
    const currentTime = new Date().toISOString();
    
    // 处理通知
    await processNotifications(products, previousProducts, currentConfig.watchConfigs, currentConfig.telegramConfig, currentTime);
    
    // 更新上次检查的产品信息
    previousProducts = [...products];
  } catch (error) {
    console.error('监控服务错误:', error);
  }
}

// 启动监控服务
function startMonitoring(config: AppConfig) {
  // 如果已经有定时器在运行，先清除
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  
  // 保存配置
  currentConfig = config;
  saveConfig(config);
  console.log('已保存完整配置到文件，包括Telegram配置');
  
  // 加载历史记录
  statusHistory = loadHistory();
  
  // 立即执行一次检查
  checkAvailability();
  
  // 设置新的定时器
  const intervalMs = config.checkIntervalSeconds * 1000;
  monitorInterval = setInterval(checkAvailability, intervalMs);
  
  console.log('服务器端监控服务已启动');
}

// 停止监控服务
function stopMonitoring() {
  // 清除定时器
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  
  console.log('服务器端监控服务已停止');
}

// 启动监控API
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const config = await request.json() as AppConfig;
    
    // 检查是否包含测试模式参数
    const url = new URL(request.url);
    const isTestMode = url.searchParams.get('testMode') === 'true';
    
    if (isTestMode) {
      console.log('启用测试模式');
      testMode = true;
      
      // 生成测试数据
      testModeProducts = generateTestProducts();
    } else {
      testMode = false;
    }
    
    // 保存配置到文件
    saveConfig(config);
    console.log('已保存完整配置到文件，包括Telegram配置');
    
    // 启动监控服务
    startMonitoring(config);
    
    return NextResponse.json({ 
      success: true, 
      message: '监控服务已启动',
      testMode: testMode
    });
  } catch (error) {
    console.error('启动监控服务失败:', error);
    return NextResponse.json(
      { success: false, error: '启动监控服务失败' },
      { status: 500 }
    );
  }
}

// 获取监控状态API
export async function GET() {
  return NextResponse.json({
    running: monitorInterval !== null,
    config: currentConfig,
    lastCheck: previousProducts.length > 0 ? new Date().toISOString() : null
  });
}

// 停止监控API
export async function DELETE() {
  try {
    stopMonitoring();
    return NextResponse.json({ 
      success: true, 
      message: '监控服务已停止' 
    });
  } catch (error) {
    console.error('停止监控服务失败:', error);
    return NextResponse.json(
      { success: false, error: '停止监控服务失败' },
      { status: 500 }
    );
  }
}

// 在服务器启动时初始化监控服务
function initMonitoringOnServerStart() {
  // 尝试从文件加载配置
  const savedConfig = loadConfig();
  if (savedConfig) {
    console.log('从文件加载监控配置');
    startMonitoring(savedConfig);
  } else {
    console.log('没有找到保存的监控配置');
  }
}

// 服务器启动时尝试初始化监控
try {
  initMonitoringOnServerStart();
} catch (error) {
  console.error('初始化监控服务失败:', error);
}

// 切换测试产品可用性API
export async function PUT(request: NextRequest) {
  try {
    // 解析请求体
    const { availability } = await request.json();
    
    if (testMode && testModeProducts.length > 0) {
      // 找到第一个测试产品
      const product = testModeProducts[0];
      
      // 找到gra数据中心
      const graDatacenter = product.datacenters.find(
        dc => dc.datacenter.toLowerCase().includes('gra')
      );
      
      if (graDatacenter) {
        // 更新可用性
        const oldAvailability = graDatacenter.availability;
        graDatacenter.availability = availability;
        
        console.log(`测试模式：产品 ${product.fqn} 的数据中心 ${graDatacenter.datacenter} 可用性从 ${oldAvailability} 变更为 ${availability}`);
        
        // 立即执行一次检查
        checkAvailability();
        
        return NextResponse.json({ 
          success: true, 
          message: '测试产品可用性已更新',
          oldAvailability,
          newAvailability: availability
        });
      }
      
      return NextResponse.json(
        { success: false, error: '未找到gra数据中心' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: '测试模式未启用' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('更新测试产品可用性失败:', error);
    return NextResponse.json(
      { success: false, error: '更新测试产品可用性失败' },
      { status: 500 }
    );
  }
} 