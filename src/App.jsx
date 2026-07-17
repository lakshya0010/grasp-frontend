import { useState } from "react";

function App() {
  const [nodeName, setNodeName] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [subgraph, setSubgraph] = useState(null)

  const askQuestion = async() => {
    setLoading(true)
    const response = await fetch('http://localhost:8000/query',{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_id: 4,
        node_name:nodeName,
        question: question
      })
    })
    const data = await response.json()
    setAnswer(data.answer)
    setSubgraph(data.subgraph)
    console.log('subgraph:', data.subgraph)
    setLoading(false)
  }

  return(
    <div>
      <h1>Grasp</h1>

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
      {subgraph && (
        <div>
          <h3>Nodes in this subgraph:</h3>
          <ul>
            {subgraph.nodes.map((node) => (
              <li key={node.id}>
                {node.name} {node.is_external ? '(external)' : '(internal)'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App