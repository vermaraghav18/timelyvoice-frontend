// CommentItem.jsx
export default function CommentItem({ c, children }) {
  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid #eee' }}>
      <div style={{ fontWeight: 600 }}>{c.authorName}{c.flags?.isAuthor ? ' • Author' : ''}</div>
      <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{c.content}</div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>{new Date(c.createdAt).toLocaleString()}</div>
      {children}
    </div>
  );
}
