// CommentThread.jsx
import CommentItem from './CommentItem';

export default function CommentThread({ comments = [] }) {
  // nest by parentId
  const byParent = comments.reduce((m, c) => {
    const pid = c.parentId || 'root';
    (m[pid] ||= []).push(c);
    return m;
  }, {});
  function renderList(parentId = 'root', depth = 0) {
    return (byParent[parentId] || []).map(c => (
      <div key={c._id} style={{ marginLeft: depth ? 16 : 0 }}>
        <CommentItem c={c}>{renderList(c._id, depth + 1)}</CommentItem>
      </div>
    ));
  }
  return <div>{renderList()}</div>;
}
