'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  IconLoader2,
  IconArrowLeft,
  IconPlayerPlay,
  IconDeviceFloppy,
  IconPlus,
  IconBolt,
  IconMail,
  IconClock,
  IconGitBranch,
  IconArrowsSplit,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriggerNode, SendNode, WaitNode, ConditionNode, SplitNode } from './flow-nodes'
import { createCampaign } from '@/lib/actions/campaigns'
import type { ClientWithCount } from '@/lib/actions/clients'
import type { TemplateWithContent } from '@/lib/actions/templates'

const nodeTypes = {
  trigger: TriggerNode,
  send: SendNode,
  wait: WaitNode,
  condition: ConditionNode,
  split: SplitNode,
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Campaign Start', triggerType: 'manual' },
  },
]

const initialEdges: Edge[] = []

interface CampaignBuilderProps {
  clients: ClientWithCount[]
  templates: TemplateWithContent[]
  initialData?: {
    id: string
    name: string
    description: string | null
    clientId: string
    type: 'one_time' | 'recurring' | 'triggered'
    triggerType: string
    nodes: Node[]
    edges: Edge[]
  }
}

export function CampaignBuilder({ clients, templates, initialData }: CampaignBuilderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [campaignName, setCampaignName] = React.useState(initialData?.name || 'Untitled Campaign')
  const [selectedClient, setSelectedClient] = React.useState(initialData?.clientId || '')
  const [campaignType, setCampaignType] = React.useState<'one_time' | 'recurring' | 'triggered'>(
    initialData?.type || 'one_time'
  )

  const onConnect = React.useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = React.useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const addNode = React.useCallback(
    (type: string) => {
      const id = `${type}-${Date.now()}`
      const newNode: Node = {
        id,
        type,
        position: { x: 250, y: (nodes.length + 1) * 150 },
        data: getDefaultNodeData(type),
      }
      setNodes((nds) => [...nds, newNode])
    },
    [nodes.length, setNodes]
  )

  const updateNodeData = React.useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node))
      )
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...data } } : null))
      }
    },
    [selectedNode?.id, setNodes]
  )

  const handleSave = async () => {
    if (!selectedClient) {
      alert('Please select a client')
      return
    }

    setIsLoading(true)
    try {
      await createCampaign({
        clientId: selectedClient,
        name: campaignName,
        type: campaignType,
        triggerType: 'manual',
        flowData: {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type || 'default',
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined,
          })),
        },
      })
      router.push('/campaigns')
      router.refresh()
    } catch (error) {
      console.error('Failed to save campaign:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <IconArrowLeft className="size-4" />
          </Button>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="h-8 w-[200px] border-none bg-transparent text-lg font-semibold focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <IconLoader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="mr-2 size-4" />
            )}
            Save Draft
          </Button>
          <Button disabled={isLoading}>
            <IconPlayerPlay className="mr-2 size-4" />
            Activate
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Sidebar - Settings */}
        <div className="w-64 shrink-0 border-r bg-muted/30 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select
                value={campaignType}
                onValueChange={(v) => setCampaignType(v as 'one_time' | 'recurring' | 'triggered')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="triggered">Triggered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Label className="mb-3 block">Add Node</Label>
              <div className="grid grid-cols-2 gap-2">
                <NodeButton
                  icon={<IconMail className="size-4" />}
                  label="Send"
                  onClick={() => addNode('send')}
                />
                <NodeButton
                  icon={<IconClock className="size-4" />}
                  label="Wait"
                  onClick={() => addNode('wait')}
                />
                <NodeButton
                  icon={<IconGitBranch className="size-4" />}
                  label="Condition"
                  onClick={() => addNode('condition')}
                />
                <NodeButton
                  icon={<IconArrowsSplit className="size-4" />}
                  label="Split"
                  onClick={() => addNode('split')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Node Config */}
        <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <SheetContent className="w-[400px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Configure Node</SheetTitle>
              <SheetDescription>
                Configure the settings for this node
              </SheetDescription>
            </SheetHeader>
            {selectedNode && (
              <NodeConfigPanel
                node={selectedNode}
                templates={templates}
                onUpdate={(data) => updateNodeData(selectedNode.id, data)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function NodeButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-auto flex-col gap-1 py-3"
      onClick={onClick}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  )
}

function getDefaultNodeData(type: string): Record<string, unknown> {
  switch (type) {
    case 'trigger':
      return { label: 'Campaign Start', triggerType: 'manual' }
    case 'send':
      return { label: 'Send Message', templateId: '', channel: 'whatsapp' }
    case 'wait':
      return { label: 'Wait', duration: 1, unit: 'days' }
    case 'condition':
      return { label: 'Condition', field: '', operator: 'equals', value: '' }
    case 'split':
      return { label: 'A/B Split', splitRatio: 50 }
    default:
      return { label: 'Node' }
  }
}

function NodeConfigPanel({
  node,
  templates,
  onUpdate,
}: {
  node: Node
  templates: TemplateWithContent[]
  onUpdate: (data: Record<string, unknown>) => void
}) {
  switch (node.type) {
    case 'send':
      return (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select
              value={node.data.templateId as string}
              onValueChange={(v) => onUpdate({ templateId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    case 'wait':
      return (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                type="number"
                min={1}
                value={node.data.duration as number}
                onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={node.data.unit as string}
                onValueChange={(v) => onUpdate({ unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )

    case 'condition':
      return (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Field</Label>
            <Input
              value={node.data.field as string}
              onChange={(e) => onUpdate({ field: e.target.value })}
              placeholder="e.g., contact.email"
            />
          </div>
          <div className="space-y-2">
            <Label>Operator</Label>
            <Select
              value={node.data.operator as string}
              onValueChange={(v) => onUpdate({ operator: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              value={node.data.value as string}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Value to compare"
            />
          </div>
        </div>
      )

    case 'split':
      return (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Split Ratio (Variant A %)</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={node.data.splitRatio as number}
              onChange={(e) => onUpdate({ splitRatio: parseInt(e.target.value) || 50 })}
            />
            <p className="text-xs text-muted-foreground">
              Variant B will receive {100 - (node.data.splitRatio as number)}%
            </p>
          </div>
        </div>
      )

    default:
      return (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            No configuration options for this node type.
          </p>
        </div>
      )
  }
}
