'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  IconBolt,
  IconMail,
  IconClock,
  IconGitBranch,
  IconArrowsSplit,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'

const baseNodeStyles = 'rounded-lg border-2 bg-background shadow-md'

interface BaseNodeData {
  label: string
}

// Trigger Node - Start of the flow
interface TriggerNodeData extends BaseNodeData {
  triggerType: 'manual' | 'schedule' | 'event'
}

export const TriggerNode = memo(function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <div
      className={cn(
        baseNodeStyles,
        'min-w-[180px] border-amber-500/50 bg-amber-50 dark:bg-amber-950/20',
        selected && 'ring-2 ring-amber-500'
      )}
    >
      <div className="flex items-center gap-2 border-b border-amber-200 p-3 dark:border-amber-800">
        <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/20">
          <IconBolt className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="font-medium text-amber-900 dark:text-amber-100">Trigger</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-amber-700 dark:text-amber-300">{data.label}</p>
        <p className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/70">
          {data.triggerType === 'manual' && 'Manual start'}
          {data.triggerType === 'schedule' && 'Scheduled'}
          {data.triggerType === 'event' && 'Event-based'}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-amber-500 !bg-white dark:!bg-gray-900"
      />
    </div>
  )
})

// Send Node - Send a message
interface SendNodeData extends BaseNodeData {
  templateId: string
  channel: string
}

export const SendNode = memo(function SendNode({ data, selected }: NodeProps<SendNodeData>) {
  return (
    <div
      className={cn(
        baseNodeStyles,
        'min-w-[180px] border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
        selected && 'ring-2 ring-blue-500'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-blue-500 !bg-white dark:!bg-gray-900"
      />
      <div className="flex items-center gap-2 border-b border-blue-200 p-3 dark:border-blue-800">
        <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/20">
          <IconMail className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="font-medium text-blue-900 dark:text-blue-100">Send Message</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-blue-700 dark:text-blue-300">{data.label}</p>
        {data.templateId ? (
          <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/70">
            Template selected
          </p>
        ) : (
          <p className="mt-1 text-xs text-red-500">No template selected</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-blue-500 !bg-white dark:!bg-gray-900"
      />
    </div>
  )
})

// Wait Node - Delay execution
interface WaitNodeData extends BaseNodeData {
  duration: number
  unit: 'minutes' | 'hours' | 'days'
}

export const WaitNode = memo(function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
  return (
    <div
      className={cn(
        baseNodeStyles,
        'min-w-[180px] border-purple-500/50 bg-purple-50 dark:bg-purple-950/20',
        selected && 'ring-2 ring-purple-500'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-purple-500 !bg-white dark:!bg-gray-900"
      />
      <div className="flex items-center gap-2 border-b border-purple-200 p-3 dark:border-purple-800">
        <div className="flex size-8 items-center justify-center rounded-md bg-purple-500/20">
          <IconClock className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="font-medium text-purple-900 dark:text-purple-100">Wait</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-purple-700 dark:text-purple-300">{data.label}</p>
        <p className="mt-1 text-xs text-purple-600/70 dark:text-purple-400/70">
          {data.duration} {data.unit}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-purple-500 !bg-white dark:!bg-gray-900"
      />
    </div>
  )
})

// Condition Node - Branch based on condition
interface ConditionNodeData extends BaseNodeData {
  field: string
  operator: string
  value: string
}

export const ConditionNode = memo(function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  return (
    <div
      className={cn(
        baseNodeStyles,
        'min-w-[180px] border-green-500/50 bg-green-50 dark:bg-green-950/20',
        selected && 'ring-2 ring-green-500'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-green-500 !bg-white dark:!bg-gray-900"
      />
      <div className="flex items-center gap-2 border-b border-green-200 p-3 dark:border-green-800">
        <div className="flex size-8 items-center justify-center rounded-md bg-green-500/20">
          <IconGitBranch className="size-4 text-green-600 dark:text-green-400" />
        </div>
        <span className="font-medium text-green-900 dark:text-green-100">Condition</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-green-700 dark:text-green-300">{data.label}</p>
        {data.field ? (
          <p className="mt-1 text-xs text-green-600/70 dark:text-green-400/70">
            {data.field} {data.operator} {data.value}
          </p>
        ) : (
          <p className="mt-1 text-xs text-red-500">Not configured</p>
        )}
      </div>
      {/* True branch (Yes) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: '30%' }}
        className="!size-3 !border-2 !border-green-600 !bg-white dark:!bg-gray-900"
      />
      {/* False branch (No) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: '70%' }}
        className="!size-3 !border-2 !border-red-500 !bg-white dark:!bg-gray-900"
      />
      <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs font-medium text-green-600">
        Yes
      </div>
      <div className="absolute -bottom-5 left-[70%] -translate-x-1/2 text-xs font-medium text-red-500">
        No
      </div>
    </div>
  )
})

// Split Node - A/B testing
interface SplitNodeData extends BaseNodeData {
  splitRatio: number
}

export const SplitNode = memo(function SplitNode({ data, selected }: NodeProps<SplitNodeData>) {
  const ratioA = data.splitRatio
  const ratioB = 100 - data.splitRatio

  return (
    <div
      className={cn(
        baseNodeStyles,
        'min-w-[180px] border-orange-500/50 bg-orange-50 dark:bg-orange-950/20',
        selected && 'ring-2 ring-orange-500'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-orange-500 !bg-white dark:!bg-gray-900"
      />
      <div className="flex items-center gap-2 border-b border-orange-200 p-3 dark:border-orange-800">
        <div className="flex size-8 items-center justify-center rounded-md bg-orange-500/20">
          <IconArrowsSplit className="size-4 text-orange-600 dark:text-orange-400" />
        </div>
        <span className="font-medium text-orange-900 dark:text-orange-100">A/B Split</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-orange-700 dark:text-orange-300">{data.label}</p>
        <p className="mt-1 text-xs text-orange-600/70 dark:text-orange-400/70">
          {ratioA}% / {ratioB}%
        </p>
      </div>
      {/* Variant A */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ left: '30%' }}
        className="!size-3 !border-2 !border-orange-600 !bg-white dark:!bg-gray-900"
      />
      {/* Variant B */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ left: '70%' }}
        className="!size-3 !border-2 !border-orange-600 !bg-white dark:!bg-gray-900"
      />
      <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs font-medium text-orange-600">
        A ({ratioA}%)
      </div>
      <div className="absolute -bottom-5 left-[70%] -translate-x-1/2 text-xs font-medium text-orange-600">
        B ({ratioB}%)
      </div>
    </div>
  )
})
