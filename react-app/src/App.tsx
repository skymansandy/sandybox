import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import docsData from 'virtual:docs-data'
import { knowledgeTree, type TreeNode } from './knowledgeTree'
import { preprocessMkDocsMarkdown, extractToc, type TocEntry } from './mdPreprocess'
import './App.css'

const categoryColors: Record<string, string> = {
  mobile: '#ec4899', programming: '#8b5cf6', infra: '#06b6d4',
  science: '#10b981', tools: '#f59e0b', til: '#a855f7',
}

const NODE_HEIGHT = 42
const NODE_GAP_Y = 8
const LEVEL_GAP_X = 220
const ROOT_X = 100

interface LayoutNode {
  id: string; label: string; icon?: string;
  x: number; y: number; width: number;
  parentId?: string; depth: number; category: string;
  hasChildren: boolean; hasDoc: boolean; docPath?: string;
  treeNode: TreeNode;
}

interface Edge { from: string; to: string; color: string }

function measureText(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55 + 60
}

function getCategory(node: TreeNode, parent?: string): string {
  if (['mobile', 'programming', 'infra', 'science', 'tools', 'til'].includes(node.id)) return node.id
  return parent || 'root'
}

function flattenAllLeaves(node: TreeNode): { id: string; label: string; docPath?: string; icon?: string }[] {
  const results: { id: string; label: string; docPath?: string; icon?: string }[] = []
  function walk(n: TreeNode) {
    if (n.docPath) results.push({ id: n.id, label: n.label, docPath: n.docPath, icon: n.icon })
    n.children?.forEach(walk)
  }
  walk(node)
  return results
}

// Custom heading renderer that adds IDs for TOC linking
function HeadingRenderer({ level, children, ...props }: { level: number; children: React.ReactNode; [key: string]: unknown }) {
  const text = typeof children === 'string' ? children : String(children)
  const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return <Tag id={id} {...props}>{children}</Tag>
}

// TOC Component
function TableOfContents({ toc, activeId }: { toc: TocEntry[]; activeId: string }) {
  return (
    <nav className="toc-nav">
      <div className="toc-title">On this page</div>
      <ul className="toc-list">
        {toc.filter(e => e.level >= 2 && e.level <= 4).map((entry) => (
          <li key={entry.id} className={`toc-item toc-level-${entry.level} ${activeId === entry.id ? 'active' : ''}`}>
            <a href={`#${entry.id}`} onClick={(e) => {
              e.preventDefault()
              document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function App() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedBreadcrumb, setSelectedBreadcrumb] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [activeTocId, setActiveTocId] = useState('')
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentBodyRef = useRef<HTMLDivElement>(null)

  // Preprocessed markdown + toc
  const { processedMd, toc } = useMemo(() => {
    if (!selectedDoc || !docsData[selectedDoc]) return { processedMd: '', toc: [] }
    const raw = docsData[selectedDoc]
    return { processedMd: preprocessMkDocsMarkdown(raw), toc: extractToc(raw) }
  }, [selectedDoc])

  // Scroll spy for TOC active heading
  useEffect(() => {
    const container = contentBodyRef.current
    if (!container || toc.length === 0) return
    const handleScroll = () => {
      const headings = toc.map(t => document.getElementById(t.id)).filter(Boolean) as HTMLElement[]
      let current = ''
      for (const h of headings) {
        const rect = h.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        if (rect.top - containerRect.top <= 80) current = h.id
      }
      setActiveTocId(current)
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [toc, selectedDoc])

  // Scroll to top when doc changes
  useEffect(() => {
    contentBodyRef.current?.scrollTo(0, 0)
    setActiveTocId('')
  }, [selectedDoc])

  // Build layout from tree + expanded state
  const { nodes, edges } = useMemo(() => {
    const layoutNodes: LayoutNode[] = []
    const layoutEdges: Edge[] = []
    let globalY = 0

    function layoutSubtree(node: TreeNode, depth: number, category: string, parentId?: string): { startY: number; endY: number; centerY: number } {
      const x = ROOT_X + depth * LEVEL_GAP_X
      const hasChildren = !!(node.children?.length)
      const isExpanded = expanded.has(node.id)
      const fontSize = depth === 0 ? 22 : depth === 1 ? 15 : 14
      const width = measureText(node.label, fontSize)
      const cat = getCategory(node, category)

      if (!hasChildren || !isExpanded) {
        const y = globalY
        globalY += NODE_HEIGHT + NODE_GAP_Y
        layoutNodes.push({ id: node.id, label: node.label, icon: node.icon, x, y, width, parentId, depth, category: cat, hasChildren, hasDoc: !!node.docPath, docPath: node.docPath, treeNode: node })
        if (parentId) layoutEdges.push({ from: parentId, to: node.id, color: categoryColors[cat] || '#6366f1' })
        return { startY: y, endY: y, centerY: y }
      }

      const childResults = node.children!.map(child => layoutSubtree(child, depth + 1, cat, node.id))
      const centerY = (childResults[0].centerY + childResults[childResults.length - 1].centerY) / 2
      layoutNodes.push({ id: node.id, label: node.label, icon: node.icon, x, y: centerY, width, parentId, depth, category: cat, hasChildren, hasDoc: !!node.docPath, docPath: node.docPath, treeNode: node })
      if (parentId) layoutEdges.push({ from: parentId, to: node.id, color: categoryColors[cat] || '#6366f1' })
      return { startY: childResults[0].startY, endY: childResults[childResults.length - 1].endY, centerY }
    }

    layoutSubtree(knowledgeTree, 0, 'root')
    return { nodes: layoutNodes, edges: layoutEdges }
  }, [expanded])

  // Center on mount
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const rootNode = nodes.find(n => n.id === 'root')
      if (rootNode) setPan({ x: rect.width * 0.15, y: rect.height / 2 - rootNode.y * zoom })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = useCallback((node: LayoutNode) => {
    if (node.hasChildren) {
      setExpanded(prev => {
        const next = new Set(prev)
        if (next.has(node.id)) {
          const removeDesc = (n: TreeNode) => { next.delete(n.id); n.children?.forEach(removeDesc) }
          removeDesc(node.treeNode)
        } else { next.add(node.id) }
        return next
      })
    }
    if (node.docPath && docsData[node.docPath]) {
      const crumbs: string[] = []
      const findPath = (tree: TreeNode, target: string, path: string[]): boolean => {
        if (tree.id === target) { crumbs.push(...path, tree.label); return true }
        return !!tree.children?.some(child => findPath(child, target, [...path, tree.label]))
      }
      findPath(knowledgeTree, node.id, [])
      setSelectedBreadcrumb(crumbs)
      setSelectedLabel(node.label)
      setSelectedDoc(node.docPath)
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.mindmap-node')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) })
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.min(2, Math.max(0.3, zoom * (e.deltaY > 0 ? 0.9 : 1.1)))
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top
    setPan(prev => ({ x: cx - (cx - prev.x) * (newZoom / zoom), y: cy - (cy - prev.y) * (newZoom / zoom) }))
    setZoom(newZoom)
  }, [zoom])

  const allLeaves = useMemo(() => flattenAllLeaves(knowledgeTree), [])
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    return allLeaves.filter(l => l.label.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
  }, [search, allLeaves])

  const handleSearchSelect = useCallback((item: typeof allLeaves[0]) => {
    if (item.docPath && docsData[item.docPath]) {
      const findAndExpand = (tree: TreeNode, target: string, path: TreeNode[]): TreeNode[] | null => {
        if (tree.id === target) return [...path, tree]
        if (tree.children) for (const child of tree.children) { const r = findAndExpand(child, target, [...path, tree]); if (r) return r }
        return null
      }
      const nodePath = findAndExpand(knowledgeTree, item.id, [])
      if (nodePath) {
        setExpanded(prev => { const next = new Set(prev); nodePath.forEach(n => next.add(n.id)); return next })
        setSelectedBreadcrumb(nodePath.map(n => n.label))
        setSelectedLabel(item.label)
        setSelectedDoc(item.docPath!)
      }
    }
    setSearch('')
  }, [])

  const nodeMap = useMemo(() => {
    const map: Record<string, LayoutNode> = {}
    nodes.forEach(n => { map[n.id] = n })
    return map
  }, [nodes])

  const resetView = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const rootNode = nodes.find(n => n.id === 'root')
      if (rootNode) { setZoom(1); setPan({ x: rect.width * 0.15, y: rect.height / 2 - rootNode.y }) }
    }
  }, [nodes])

  const markdownComponents = useMemo(() => ({
    h1: (props: object) => <HeadingRenderer level={1} {...props} />,
    h2: (props: object) => <HeadingRenderer level={2} {...props} />,
    h3: (props: object) => <HeadingRenderer level={3} {...props} />,
    h4: (props: object) => <HeadingRenderer level={4} {...props} />,
  }), [])

  return (
    <div className="app">
      {/* ===== MINDMAP CANVAS ===== */}
      <div className="mindmap-canvas" ref={canvasRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="bg-dots" />

        <div className="search-bar">
          <span className="search-icon">&#128269;</span>
          <input placeholder="Search topics..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(r => (
              <div key={r.id} className="search-result-item" onClick={() => handleSearchSelect(r)}>
                <span>{r.icon || '📄'}</span>
                <span>{r.label}</span>
                <span className="result-path">{r.docPath}</span>
              </div>
            ))}
          </div>
        )}

        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {edges.map(edge => {
              const from = nodeMap[edge.from], to = nodeMap[edge.to]
              if (!from || !to) return null
              const x1 = from.x + from.width, y1 = from.y + NODE_HEIGHT / 2
              const x2 = to.x, y2 = to.y + NODE_HEIGHT / 2
              return (
                <path key={`${edge.from}-${edge.to}`} className="edge-line"
                  d={`M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.4} ${y1}, ${x2 - (x2 - x1) * 0.4} ${y2}, ${x2} ${y2}`}
                  stroke={edge.color} />
              )
            })}
          </g>
        </svg>

        <div className="mindmap-viewport" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>
          {nodes.map(node => (
            <div key={node.id}
              className={['mindmap-node', node.depth === 0 && 'root-node', node.depth === 1 && 'category-node',
                expanded.has(node.id) && node.hasChildren && 'expanded', node.hasDoc && 'has-doc', 'node-enter'].filter(Boolean).join(' ')}
              data-category={node.category}
              style={{ left: node.x, top: node.y, width: node.width, height: NODE_HEIGHT, animationDelay: `${node.depth * 0.05}s` }}
              onClick={() => handleNodeClick(node)}>
              {node.icon && <span className="node-icon">{node.icon}</span>}
              <span className="node-label">{node.label}</span>
              {node.hasChildren && <span className="node-expand">&#9654;</span>}
            </div>
          ))}
        </div>

        <div className="controls">
          <button onClick={() => setZoom(z => Math.min(2, z * 1.2))} title="Zoom in">+</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} title="Zoom out">-</button>
          <button onClick={resetView} title="Reset view">&#8962;</button>
          <button onClick={() => { const all = new Set<string>(); const addAll = (n: TreeNode) => { all.add(n.id); n.children?.forEach(addAll) }; addAll(knowledgeTree); setExpanded(all) }} title="Expand all">&#9776;</button>
          <button onClick={() => setExpanded(new Set(['root']))} title="Collapse all">&#9866;</button>
        </div>
      </div>

      {/* ===== CONTENT PANEL (MkDocs-style) ===== */}
      <div className={`content-panel ${selectedDoc ? 'open' : ''}`}>
        <div className="content-panel-inner">
          {/* Top bar with breadcrumb + close */}
          <div className="content-topbar">
            <div className="breadcrumb">
              {selectedBreadcrumb.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <span className="sep">&rsaquo;</span>}
                  <span className={i === selectedBreadcrumb.length - 1 ? 'crumb-active' : 'crumb'}>{crumb}</span>
                </span>
              ))}
            </div>
            <button className="content-close" onClick={() => setSelectedDoc(null)}>&#10005;</button>
          </div>

          {/* Main content area with article + TOC sidebar */}
          <div className="content-layout">
            <article className="content-body" ref={contentBodyRef}>
              {selectedDoc && docsData[selectedDoc] && (
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {processedMd}
                  </ReactMarkdown>
                </div>
              )}
            </article>

            {/* TOC sidebar */}
            {toc.length > 0 && (
              <aside className="toc-sidebar">
                <TableOfContents toc={toc} activeId={activeTocId} />
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
