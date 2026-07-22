import { useState, useEffect} from 'react'
import { ReactFlow, Controls, Background, MarkerType} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'

const NODE_WIDTH = 180
const NODE_HEIGHT = 40

function getLayoutedElements(nodes, edges) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(()=>({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 150 })
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const {x,y} = dagreGraph.node(node.id)
    return {
      ...node,
      position: {x,y}
    }
  })
  return {nodes:layoutedNodes, edges}
}
function App() {
  const [flowNodes, setFlowNodes] = useState([])
  const [flowEdges, setFlowEdges] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const repo_id = 4

  useEffect(()=>{
    const loadGraph = async () => {
    const response = await fetch(`http://localhost:8000/graph/${repo_id}`)
    const data = await response.json()

    const internalNodes = data.graph_data.nodes.filter(n => !n.is_external)
    const internalNodeIds = new Set(internalNodes.map(n => n.id))

    const rfNodes = internalNodes.map((node) => ({
      id: String(node.id),
      position: { x: 0, y: 0 },
      data: { label: node.name },
      style: {  background: '#a745ac',
    color: '#000203',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '12px' }
    }))

    const rfEdges = data.graph_data.edges
      .filter(e => internalNodeIds.has(e.caller_id) && internalNodeIds.has(e.callee_id))
      .map((edge, index) => ({
        id: `e-${index}`,
        source: String(edge.caller_id),
        target: String(edge.callee_id),
        markerEnd: { type: MarkerType.ArrowClosed }
      }))

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges)
    setFlowNodes(layoutedNodes)
    setFlowEdges(layoutedEdges)
  }
  loadGraph()
  }, [repo_id])

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
        repo_id: repo_id,
        node_name: selectedNode.data.label,
        question: question
      })
    })
    const data = await response.json()
    setAnswer(data.answer)
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlow nodes={flowNodes} edges={flowEdges} onNodeClick={onNodeClick} fitView>
        <Controls />
        <Background />
      </ReactFlow>

      {selectedNode && (
        <div style={{
          position: 'absolute',
          bottom: '160px',
          left: '20px',
          width: '200px',
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        }}>
          <h3>{selectedNode.data.label}</h3>
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <button onClick={askQuestion}>Ask</button>
          {loading && <p>Loading...</p>}
          {answer && <p>{answer}</p>}
          <button onClick={() => setSelectedNode(null)}>Close</button>
        </div>
      )}
    </div>
  )
}

export default App