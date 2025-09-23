import React, { useEffect, useState } from 'react'

type Ticket = {
  id: string
  subject: string
  status: string
  createdAt: string
}

function TicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: 'demo-partner', subject, description })
    })
    setSubject('')
    setDescription('')
    onCreated()
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 20 }}>
      <div>
        <label>Subject</label><br />
        <input value={subject} onChange={e => setSubject(e.target.value)} required style={{ width: 400 }} />
      </div>
      <div>
        <label>Description</label><br />
        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: 400, height: 100 }} />
      </div>
      <button type="submit">Submit Ticket</button>
    </form>
  )
}

function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])

  async function load() {
    const res = await fetch('/api/tickets')
    const data = await res.json()
    setTickets(data)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h3>Tickets</h3>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: 6, textAlign: 'left' }}>Subject</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id}>
              <td style={{ padding: 6 }}>{t.subject}</td>
              <td style={{ padding: 6 }}>{t.status}</td>
              <td style={{ padding: 6 }}>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [reload, setReload] = useState(0)
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
      <h1 style={{ color: '#005a8d' }}>LounGenie Support Portal (Scaffold)</h1>
      <TicketForm onCreated={() => setReload(r => r + 1)} />
      <TicketList key={reload} />
    </div>
  )
}
