'use client';

import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Download, Share2, Plus, Minus, Home } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { exportMindMapToPNG, generateFilename } from '@/lib/export-utils';

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children?: MindMapNode[];
}

interface MindMapViewerProps {
  title: string;
  nodes: MindMapNode[];
  onClose?: () => void;
}

interface NodePosition {
  x: number;
  y: number;
  node: MindMapNode;
  level: number;
  angle: number;
  parent?: NodePosition;
}

// Color palette for different levels
const LEVEL_COLORS = [
  { bg: 'var(--accent-primary)', text: 'white' },
  { bg: '#10B981', text: 'white' }, // emerald
  { bg: '#8B5CF6', text: 'white' }, // violet
  { bg: '#F59E0B', text: 'white' }, // amber
  { bg: '#EC4899', text: 'white' }, // pink
  { bg: '#06B6D4', text: 'white' }, // cyan
];

export function MindMapViewer({ title, nodes, onClose }: MindMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Export handler
  const handleExportPNG = async () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      await exportMindMapToPNG(svgRef.current, title, generateFilename('mind-map'));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate node positions in a radial layout
  const calculatePositions = useCallback((): NodePosition[] => {
    const positions: NodePosition[] = [];
    const centerX = 400;
    const centerY = 300;
    const baseRadius = 150;

    // Process each main branch
    const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);

    nodes.forEach((node, index) => {
      const angle = angleStep * index - Math.PI / 2; // Start from top
      const x = centerX + Math.cos(angle) * baseRadius;
      const y = centerY + Math.sin(angle) * baseRadius;

      const nodePos: NodePosition = { x, y, node, level: 1, angle };
      positions.push(nodePos);

      // Process children if not collapsed
      if (node.children && !collapsedNodes.has(node.id)) {
        const childAngleSpread = Math.PI / 3; // 60 degrees spread
        const childRadius = 100;

        node.children.forEach((child, childIndex) => {
          const childCount = node.children!.length;
          const childAngleOffset =
            (childAngleSpread * (childIndex - (childCount - 1) / 2)) / Math.max(childCount - 1, 1);
          const childAngle = angle + childAngleOffset;
          const childX = x + Math.cos(childAngle) * childRadius;
          const childY = y + Math.sin(childAngle) * childRadius;

          positions.push({
            x: childX,
            y: childY,
            node: child,
            level: 2,
            angle: childAngle,
            parent: nodePos,
          });

          // Process grandchildren
          if (child.children && !collapsedNodes.has(child.id)) {
            const grandchildRadius = 70;
            child.children.forEach((grandchild, gcIndex) => {
              const gcCount = child.children!.length;
              const gcAngleOffset =
                ((Math.PI / 4) * (gcIndex - (gcCount - 1) / 2)) / Math.max(gcCount - 1, 1);
              const gcAngle = childAngle + gcAngleOffset;
              const gcX = childX + Math.cos(gcAngle) * grandchildRadius;
              const gcY = childY + Math.sin(gcAngle) * grandchildRadius;

              positions.push({
                x: gcX,
                y: gcY,
                node: grandchild,
                level: 3,
                angle: gcAngle,
                parent: { x: childX, y: childY, node: child, level: 2, angle: childAngle },
              });
            });
          }
        });
      }
    });

    return positions;
  }, [nodes, collapsedNodes]);

  const nodePositions = calculatePositions();

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCollapsedNodes(new Set());
  };

  const toggleCollapse = (nodeId: string) => {
    const newCollapsed = new Set(collapsedNodes);
    if (newCollapsed.has(nodeId)) {
      newCollapsed.delete(nodeId);
    } else {
      newCollapsed.add(nodeId);
    }
    setCollapsedNodes(newCollapsed);
  };

  const hasChildren = (node: MindMapNode) => node.children && node.children.length > 0;

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Share2 className="mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-secondary)]">No mind map data available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Share2 className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="text-xs text-[var(--text-tertiary)]">{nodes.length} main concepts</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleZoom(-0.2)} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs text-[var(--text-tertiary)]">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => handleZoom(0.2)} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetView} className="h-8 w-8">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="h-8 w-8"
            title="Download as PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mind Map Canvas */}
      <div
        ref={containerRef}
        className="relative min-h-[400px] flex-1 cursor-grab overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] active:cursor-grabbing"
        style={{ height: 'calc(100vh - 300px)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Connection Lines */}
          <g className="connections">
            {/* Lines from center to main nodes */}
            {nodePositions
              .filter((p) => p.level === 1)
              .map((pos, idx) => (
                <line
                  key={`center-${pos.node.id}`}
                  x1={400}
                  y1={300}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={LEVEL_COLORS[idx % LEVEL_COLORS.length].bg}
                  strokeWidth={3}
                  strokeOpacity={0.6}
                />
              ))}

            {/* Lines from parent to child nodes */}
            {nodePositions
              .filter((p) => p.parent)
              .map((pos) => (
                <line
                  key={`line-${pos.node.id}`}
                  x1={pos.parent!.x}
                  y1={pos.parent!.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="var(--text-tertiary)"
                  strokeWidth={2}
                  strokeOpacity={0.4}
                />
              ))}
          </g>

          {/* Center Node (Title) */}
          <g className="center-node" style={{ cursor: 'pointer' }}>
            <circle
              cx={400}
              cy={300}
              r={50}
              fill="var(--accent-primary)"
              className="drop-shadow-lg"
            />
            <foreignObject x={350} y={280} width={100} height={40}>
              <div className="flex h-full items-center justify-center">
                <span className="px-2 text-center text-xs leading-tight font-semibold text-white">
                  {title.length > 20 ? title.slice(0, 20) + '...' : title}
                </span>
              </div>
            </foreignObject>
          </g>

          {/* Main Nodes */}
          {nodePositions.map((pos, idx) => {
            const colorIdx =
              pos.level === 1
                ? idx
                : pos.parent
                  ? nodePositions.findIndex((p) => p.node.id === pos.parent?.node.id)
                  : 0;
            const colors = LEVEL_COLORS[colorIdx % LEVEL_COLORS.length];
            const nodeSize = pos.level === 1 ? 40 : pos.level === 2 ? 30 : 24;
            const fontSize = pos.level === 1 ? 11 : pos.level === 2 ? 10 : 9;
            const isCollapsed = collapsedNodes.has(pos.node.id);
            const canCollapse = hasChildren(pos.node);

            return (
              <g
                key={pos.node.id}
                style={{ cursor: canCollapse ? 'pointer' : 'default' }}
                onClick={() => {
                  setSelectedNode(pos.node);
                  if (canCollapse) toggleCollapse(pos.node.id);
                }}
              >
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeSize}
                  fill={pos.level === 1 ? colors.bg : 'var(--bg-surface)'}
                  stroke={colors.bg}
                  strokeWidth={pos.level === 1 ? 0 : 2}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                  className="drop-shadow-md"
                />

                {/* Collapse indicator */}
                {canCollapse && (
                  <circle
                    cx={pos.x + nodeSize - 5}
                    cy={pos.y - nodeSize + 5}
                    r={8}
                    fill="var(--bg-primary)"
                    stroke={colors.bg}
                    strokeWidth={1.5}
                  />
                )}
                {canCollapse && (
                  <text
                    x={pos.x + nodeSize - 5}
                    y={pos.y - nodeSize + 9}
                    textAnchor="middle"
                    fontSize={10}
                    fill={colors.bg}
                    fontWeight="bold"
                  >
                    {isCollapsed ? '+' : '−'}
                  </text>
                )}

                <foreignObject
                  x={pos.x - nodeSize}
                  y={pos.y - nodeSize / 2}
                  width={nodeSize * 2}
                  height={nodeSize}
                >
                  <div className="flex h-full items-center justify-center px-1">
                    <span
                      className="text-center leading-tight font-medium"
                      style={{
                        fontSize: `${fontSize}px`,
                        color: pos.level === 1 ? colors.text : 'var(--text-primary)',
                      }}
                    >
                      {pos.node.label.length > 15
                        ? pos.node.label.slice(0, 15) + '...'
                        : pos.node.label}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 rounded-lg bg-[var(--bg-primary)]/80 px-3 py-2 text-xs text-[var(--text-tertiary)] backdrop-blur-sm">
          Drag to pan • Scroll to zoom • Click nodes to expand/collapse
        </div>

        {/* Floating Zoom Sidebar */}
        <div className="absolute top-1/2 left-4 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)]/90 p-1.5 shadow-lg backdrop-blur-sm">
          <button
            onClick={() => handleZoom(0.2)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Zoom in"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="py-1 text-center text-[10px] font-medium text-[var(--text-tertiary)]">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={() => handleZoom(-0.2)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Zoom out"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="my-1 h-px bg-[rgba(255,255,255,0.1)]" />
          <button
            onClick={resetView}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Reset view"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] p-4"
        >
          <h3 className="mb-1 font-semibold text-[var(--text-primary)]">{selectedNode.label}</h3>
          {selectedNode.description && (
            <p className="text-sm text-[var(--text-secondary)]">{selectedNode.description}</p>
          )}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              {selectedNode.children.length} sub-concept
              {selectedNode.children.length > 1 ? 's' : ''}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
