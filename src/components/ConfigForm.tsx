'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { useAppStore } from '@/lib/store';

const formSchema = z.object({
  botToken: z.string().min(1, { message: '需要填写Bot Token' }).or(z.string().length(0)),
  chatId: z.string().min(1, { message: '需要填写Chat ID' }).or(z.string().length(0)),
  enabled: z.boolean().default(false),
  checkIntervalSeconds: z.number().min(10).max(3600),
});

type FormData = z.infer<typeof formSchema>;

export function ConfigForm() {
  const { config, updateConfig } = useAppStore();
  const { telegramConfig, checkIntervalSeconds } = config;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      botToken: telegramConfig.botToken,
      chatId: telegramConfig.chatId,
      enabled: telegramConfig.enabled,
      checkIntervalSeconds,
    },
  });

  const enabled = watch('enabled');

  React.useEffect(() => {
    setValue('botToken', telegramConfig.botToken);
    setValue('chatId', telegramConfig.chatId);
    setValue('enabled', telegramConfig.enabled);
    setValue('checkIntervalSeconds', checkIntervalSeconds);
  }, [telegramConfig, checkIntervalSeconds, setValue]);

  const onSubmit: SubmitHandler<FormData> = (data) => {
    // 如果启用了Telegram但没有填写Token或ChatID，显示错误
    if (data.enabled && (!data.botToken || !data.chatId)) {
      alert('启用Telegram通知需要填写Bot Token和Chat ID');
      return;
    }

    updateConfig({
      telegramConfig: {
        botToken: data.botToken,
        chatId: data.chatId,
        enabled: data.enabled,
      },
      checkIntervalSeconds: data.checkIntervalSeconds,
    });

    alert('配置已保存');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium">系统配置</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">检查间隔（秒）</label>
        <Input
          type="number"
          placeholder="60"
          {...register('checkIntervalSeconds', { valueAsNumber: true })}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">最小值: 10秒, 最大值: 3600秒(1小时)</p>
      </div>
      
      <div className="space-y-4 border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">启用Telegram通知</label>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => setValue('enabled', checked)}
          />
        </div>
        
        {enabled && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Bot Token</label>
              <Input
                placeholder="输入Telegram Bot Token"
                {...register('botToken')}
                className="w-full"
              />
              {errors.botToken && (
                <p className="text-sm text-red-500 mt-1">{errors.botToken.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Chat ID</label>
              <Input
                placeholder="输入Telegram Chat ID"
                {...register('chatId')}
                className="w-full"
              />
              {errors.chatId && (
                <p className="text-sm text-red-500 mt-1">{errors.chatId.message}</p>
              )}
            </div>
          </>
        )}
      </div>
      
      <Button type="submit" className="w-full">
        保存配置
      </Button>
    </form>
  );
} 