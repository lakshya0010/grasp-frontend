import { useState, useEffect } from 'react'
import { ReactFlow, Controls, Background, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'

const NODE_WIDTH = 180
const NODE_HEIGHT = 40

const COLORS = {
  bg: '#0E1116',
  panel: '#161B22',
  border: '#2A2F38',
  text: '#E6E8EB',
  textDim: '#6B7280',
  accent: '#D9A441',
  accentDim: '#8A6A2F',
}

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  gap: '14px',
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "'Inter', sans-serif",
}

const titleStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '28px',
  fontWeight: 500,
  letterSpacing: '0.5px',
  color: COLORS.text,
  marginBottom: '8px',
}

const buttonStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '14px',
  fontWeight: 500,
  color: COLORS.text,
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '6px',
  padding: '10px 18px',
  cursor: 'pointer',
  minWidth: '220px',
  transition: 'border-color 0.15s ease, color 0.15s ease',
}

const primaryButtonStyle = {
  ...buttonStyle,
  color: COLORS.bg,
  background: COLORS.accent,
  border: `1px solid ${COLORS.accent}`,
  fontWeight: 600,
}

const inputStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  color: COLORS.text,
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '6px',
  padding: '10px 12px',
  minWidth: '260px',
  outline: 'none',
}

const backButtonStyle = {
  ...buttonStyle,
  minWidth: 'auto',
  padding: '8px 14px',
  fontSize: '13px',
  color: COLORS.textDim,
  background: 'transparent',
  border: `1px solid ${COLORS.border}`,
}

function getLayoutedElements(nodes, edges) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 150 })
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: { x, y },
    }
  })
  return { nodes: layoutedNodes, edges }
}

function App() {
  const [view, setView] = useState('start')
  const [flowNodes, setFlowNodes] = useState([])
  const [flowEdges, setFlowEdges] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [repos, setRepos] = useState([])
  const [selectedRepoId, setSelectedRepoId] = useState(null)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoPath, setNewRepoPath] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupError, setLookupError] = useState('')

  const handleLookup = async () => {
    setLookupError('')
    const response = await fetch(`http://localhost:8000/repositories/lookup?query=${encodeURIComponent(lookupQuery)}`)
    if (!response.ok) {
      setLookupError('Repository not found')
      return
    }
    const data = await response.json()
    setSelectedRepoId(data.id)
    setView('graph')
  }

  const ingestRepo = async () => {
    setIngesting(true)
    const isUrl = newRepoPath.startsWith('http')

    const response = await fetch('http://localhost:8000/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_name: newRepoName,
        repo_path: isUrl ? null : newRepoPath,
        repo_url: isUrl ? newRepoPath : null
      })
    })
    setIngesting(false)

    if (!response.ok) {
      const errorData = await response.json()
      alert(`Ingest failed: ${errorData.detail || 'Unknown error'}`)
      return  // stop here — don't touch selectedRepoId or view
    }
    const data = await response.json()
    setNewRepoName('')
    setNewRepoPath('')
    setFlowNodes([])       
    setFlowEdges([])
    setSelectedRepoId(data.id)
    setView('graph')
  }

  useEffect(() => {
    const loadRepos = async () => {
      const response = await fetch(`http://localhost:8000/repositories`)
      const data = await response.json()
      setRepos(data)
      if (data.length > 0) setSelectedRepoId(data[0].id)
    }
    loadRepos()
  }, [])

  useEffect(() => {
    if (!selectedRepoId) return
    const loadGraph = async () => {
      const response = await fetch(`http://localhost:8000/graph/${selectedRepoId}`)
      const data = await response.json()

      const allNodes = data.graph_data.nodes
      const allNodeIds = new Set(allNodes.map(n => n.id))

      const rfNodes = allNodes.map((node) => ({
        id: String(node.id),
        position: { x: 0, y: 0 },
        data: { label: node.name },
        style: {
          background: node.is_external ? '#1A1D23' : COLORS.panel,
          color: node.is_external ? COLORS.textDim : COLORS.accent,
          border: `1px solid ${node.is_external ? '#3A3F4A' : COLORS.border}`,
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
        }
      }))

      const rfEdges = data.graph_data.edges
        .filter(e => allNodeIds.has(e.caller_id) && allNodeIds.has(e.callee_id))
        .map((edge, index) => ({
          id: `e-${index}`,
          source: String(edge.caller_id),
          target: String(edge.callee_id),
          markerEnd: { type: MarkerType.ArrowClosed, color: edge.is_external ? '#3A3F4A' : COLORS.accentDim },
          style: { stroke: edge.is_external ? '#3A3F4A' : COLORS.accentDim },
        }))

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges)
      setFlowNodes(layoutedNodes)
      setFlowEdges(layoutedEdges)
    }
    loadGraph()
  }, [selectedRepoId])

  const onNodeClick = (event, node) => {
    setSelectedNode(node)
    setAnswer('')
    setQuestion('')
  }

  const askQuestion = async () => {
    setLoading(true)
    const response = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_id: selectedRepoId,
        node_name: selectedNode.data.label,
        question: question
      })
    })
    const data = await response.json()
    setAnswer(data.answer)
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: COLORS.bg }}>
      {view === 'start' && (
        <div style={screenStyle}>
          <h1 style={titleStyle}>grasp</h1>
          <p style={{ color: COLORS.textDim, fontSize: '13px', marginBottom: '10px' }}>
            understand any codebase through its call graph
          </p>
          <button style={primaryButtonStyle} onClick={() => setView('ingest')}>Ingest a new repo</button>
          <button style={buttonStyle} onClick={() => setView('lookup')}>Analyze an existing repo</button>
          <button style={buttonStyle} onClick={() => setView('test')}>Try test repos</button>
        </div>
      )}
      {view === 'ingest' && (
        <div style={screenStyle}>
          <button style={backButtonStyle} onClick={() => setView('start')}>← Back</button>
          <input
            style={inputStyle}
            placeholder="Repo name"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Local path or GitHub URL"
            value={newRepoPath}
            onChange={(e) => setNewRepoPath(e.target.value)}
          />
          <button style={primaryButtonStyle} onClick={ingestRepo} disabled={ingesting}>
            {ingesting ? 'Ingesting...' : 'Ingest'}
          </button>
        </div>
      )}
      {view === 'lookup' && (
        <div style={screenStyle}>
          <button style={backButtonStyle} onClick={() => setView('start')}>← Back</button>
          <input
            style={inputStyle}
            placeholder="Repo name or URL"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
          />
          <button style={primaryButtonStyle} onClick={handleLookup}>Find</button>
          {lookupError && <p style={{ color: '#C4544B', fontSize: '13px' }}>{lookupError}</p>}
        </div>
      )}
      {view === 'test' && (
        <div style={screenStyle}>
          <button style={backButtonStyle} onClick={() => setView('start')}>← Back</button>
          <button style={buttonStyle} onClick={() => { setSelectedRepoId(5); setView('graph') }}>InsightForge</button>
          <button style={buttonStyle} onClick={() => { setSelectedRepoId(4); setView('graph') }}>Invoice Reconciliation Agent</button>
        </div>
      )}
      {view === 'graph' && (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: COLORS.bg }}>
          <button
            style={{ ...backButtonStyle, position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}
            onClick={() => { setView('start'); setSelectedRepoId(null); setSelectedNode(null) }}
          >
            ← Back
          </button>
          <ReactFlow nodes={flowNodes} edges={flowEdges} onNodeClick={onNodeClick} fitView>
            <Controls />
            <Background color={COLORS.border} gap={20} />
          </ReactFlow>
          {selectedNode && (
            <div style={{
              position: 'absolute',
              bottom: '160px',
              left: '20px',
              width: '240px',
              maxHeight: '50vh',        // never taller than 70% of viewport height
              overflowY: 'auto',
              background: COLORS.panel,
              border: `1px solid ${COLORS.border}`,
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              fontFamily: "'Inter', sans-serif",
              color: COLORS.text,
            }}>
              <h3 style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                color: COLORS.accent,
                fontWeight: 500,
                marginBottom: '10px',
                wordBreak: 'break-word',
              }}>
                {selectedNode.data.label}
              </h3>
              <input
                type="text"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ ...inputStyle, width: '100%', minWidth: 'unset', marginBottom: '8px', fontSize: '12px' }}
              />
              <button style={{ ...primaryButtonStyle, minWidth: 'unset', width: '100%', padding: '8px' }} onClick={askQuestion}>
                Ask
              </button>
              {loading && <p style={{ color: COLORS.textDim, fontSize: '12px', marginTop: '8px' }}>Loading...</p>}
              {answer && <p style={{ color: COLORS.text, fontSize: '13px', marginTop: '10px', lineHeight: 1.5 }}>{answer}</p>}
              <button
                style={{ ...backButtonStyle, minWidth: 'unset', width: '100%', marginTop: '10px' }}
                onClick={() => setSelectedNode(null)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App