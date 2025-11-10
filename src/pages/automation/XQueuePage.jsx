import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function XQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/automation/x/queue')
      .then(res => setItems(res.data.rows || []))
      .catch(err => console.error('Queue fetch failed', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">X Queue</h1>
      {items.length === 0 ? (
        <p>No tweets in queue</p>
      ) : (
        <ul>
          {items.map(it => (
            <li key={it._id} className="border-b py-2">
              <strong>@{it.handle}</strong>: {it.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
