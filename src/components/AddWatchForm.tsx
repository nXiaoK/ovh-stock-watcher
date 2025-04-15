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
  fqn: z.string().optional(),
  datacenter: z.string().optional(),
  notifyOnAvailability: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function AddWatchForm() {
  const { addWatchConfig } = useAppStore();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fqn: '',
      datacenter: '',
      notifyOnAvailability: true,
    },
  });

  const notifyOnAvailability = watch('notifyOnAvailability');

  const onSubmit: SubmitHandler<FormData> = (data) => {
    // 至少一个筛选条件必须填写
    if (!data.fqn && !data.datacenter) {
      alert('至少填写一个筛选条件');
      return;
    }

    addWatchConfig({
      enabled: true,
      productFilters: {
        fqn: data.fqn || undefined,
        datacenter: data.datacenter || undefined,
      },
      notifyOnAvailability: data.notifyOnAvailability,
    });

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium">添加监控项</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">FQN (完全限定名)</label>
        <Input
          placeholder="例如: 1801sk.12"
          {...register('fqn')}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">数据中心</label>
        <Input
          placeholder="如：gra"
          {...register('datacenter')}
          className="w-full"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">有库存时通知</label>
        <Switch
          checked={notifyOnAvailability}
          onCheckedChange={(checked) => setValue('notifyOnAvailability', checked)}
        />
      </div>
      
      <Button type="submit" className="w-full">
        添加监控
      </Button>
    </form>
  );
} 