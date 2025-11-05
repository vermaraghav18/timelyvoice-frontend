// src/pages/admin/CategoriesPage.jsx
import { useEffect, useState } from 'react';
import { api, styles, removeManagedHeadTags, upsertTag } from '../../App.jsx';

export default function AdminCategoriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', type: 'topic', description: '' });
  const [editRow, setEditRow] = useState(null);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/categories')
      .then((res) => setItems(res.data || []))
      .catch((e) => setErr(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'CMS — Categories · NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Manage categories' });
    load();
  }, []);

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    setErr('');
    api
      .post('/categories', form)
      .then(() => {
        setForm({ name: '', slug: '', type: 'topic', description: '' });
        load();
      })
      .catch((e) => setErr(e?.response?.data?.message || e.message || 'Create failed'))
      .finally(() => setCreating(false));
  };

  const onSave = (row) => {
    setErr('');
    api
      .patch(`/categories/${row._id}`, {
        name: row.name,
        slug: row.slug,
        description: row.description,
        type: row.type || 'topic',
      })
      .then(() => {
        setEditRow(null);
        load();
      })
      .catch((e) => setErr(e?.response?.data?.message || e.message || 'Save failed'));
  };

  return (
    <main className={styles.container}>
      <h1>CMS</h1>
      <h2 className="mt-4 mb-2">Categories</h2>

      {err && <div className="mb-3 p-3 bg-red-50 rounded-lg text-red-700">{err}</div>}

      <form onSubmit={onCreate} className="p-4 bg-white rounded-xl mb-6 grid gap-3 md:grid-cols-3">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Name (e.g., World)"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Slug (e.g., world)"
          value={form.slug}
          onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
          required
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={form.type}
          onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
        >
          <option value="topic">Topic</option>
          <option value="state">State</option>
          <option value="city">City</option>
        </select>

        <input
          className="border rounded-lg px-3 py-2 md:col-span-3"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
        />
        <div>
          <button disabled={creating} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No categories yet. Create your first category above.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full bg-white rounded-xl">
            <thead>
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3">Updated</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const editing = editRow?._id === it._id;

               return (
  <tr key={it._id} className="border-t">
    {/* Name */}
    <td className="p-3">
      {editing ? (
        <input
          className="border rounded-lg px-2 py-1 w-full"
          value={editRow.name}
          onChange={(e) => setEditRow((r) => ({ ...r, name: e.target.value }))}
        />
      ) : (
        it.name
      )}
    </td>

    {/* Slug */}
    <td className="p-3">
      {editing ? (
        <input
          className="border rounded-lg px-2 py-1 w-full"
          value={editRow.slug}
          onChange={(e) => setEditRow((r) => ({ ...r, slug: e.target.value }))}
        />
      ) : (
        it.slug
      )}
    </td>

    {/* Type */}
    <td className="p-3">
      {editing ? (
        <select
          className="border rounded-lg px-2 py-1 w-full"
          value={editRow.type || 'topic'}
          onChange={(e) => setEditRow((r) => ({ ...r, type: e.target.value }))}
        >
          <option value="topic">Topic</option>
          <option value="state">State</option>
          <option value="city">City</option>
        </select>
      ) : (
        it.type || 'topic'
      )}
    </td>

    {/* Description */}
    <td className="p-3">
      {editing ? (
        <input
          className="border rounded-lg px-2 py-1 w-full"
          value={editRow.description || ''}
          onChange={(e) => setEditRow((r) => ({ ...r, description: e.target.value }))}
        />
      ) : (
        it.description || ''
      )}
    </td>

    {/* Updated */}
    <td className="p-3">
      {it.updatedAt ? new Date(it.updatedAt).toLocaleString() : '—'}
    </td>

    {/* Actions */}
    <td className="p-3 space-x-2">
      {editing ? (
        <>
          <button
            className="px-3 py-1 rounded-lg bg-emerald-600 text-white"
            onClick={() => onSave(editRow)}
          >
            Save
          </button>
          <button
            className="px-3 py-1 rounded-lg bg-gray-200"
            onClick={() => setEditRow(null)}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          className="px-3 py-1 rounded-lg bg-gray-200"
          onClick={() => setEditRow(it)}
        >
          Edit
        </button>
      )}
    </td>
  </tr>
);

              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
