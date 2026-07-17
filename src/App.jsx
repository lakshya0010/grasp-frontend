import { useState } from 'react'
import { ReactFlow, Controls, Background, MarkerType} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

function App() {
  const [nodeName, setNodeName] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [flowNodes, setFlowNodes] = useState([])
  const [flowEdges, setFlowEdges] = useState([])
  const [loading, setLoading] = useState(false)

  const askQuestion = async () => {
    setLoading(true)
    const response = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_id: 4, node_name: nodeName, question: question })
    })
    const data = await response.json()
    setAnswer(data.answer)

    // transform backend nodes into react-flow's expected shape
    const rfNodes = data.subgraph.nodes.map((node, index) => ({
      id: String(node.id),
      position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 100 },
      data: { label: node.name },
      style: { background: node.is_external ? '#eee' : '#a3e4d7' }
    }))

    // transform backend edges into react-flow's expected shape
    const rfEdges = data.subgraph.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: String(edge.caller_id ?? edge.caller),
      target: String(edge.callee_id ?? edge.callee),
      markerEnd: { type: MarkerType.ArrowClosed }
    }))

    setFlowNodes(rfNodes)
    setFlowEdges(rfEdges)
    setLoading(false)
  }

  return (
    <div>
      <div style={{ padding: '1rem' }}>
        <input
          type="text"
          placeholder="Function name"
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Your question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={askQuestion}>Ask Question</button>
        {loading && <p>Loading...</p>}
        {answer && <p>{answer}</p>}
      </div>

      <div style={{ width: '100vw', height: '600px' }}>
        <ReactFlow nodes={flowNodes} edges={flowEdges} >
        <Controls />
        <Background />
        </ReactFlow>
      </div>
    </div>
  )
}

export default App