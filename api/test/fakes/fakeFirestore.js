// Minimal in-memory Firestore-like double. Stores Dates as Timestamp-like
// objects ({toDate}) and rejects undefined values, like the real SDK default.
const ts = (d) => ({ toDate: () => d, _isTs: true });
const isTs = (v) => v && typeof v === 'object' && v._isTs;
const raw = (v) => (isTs(v) ? v.toDate() : v);

function encode(v, path = '') {
  if (v === undefined) throw new Error(`Cannot use undefined as a Firestore value (at ${path})`);
  if (v instanceof Date) return ts(v);
  if (Array.isArray(v)) return v.map((x, i) => encode(x, `${path}[${i}]`));
  if (v && typeof v === 'object' && !isTs(v)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x, `${path}.${k}`)]));
  }
  return v;
}

export function createFakeFirestore() {
  const store = new Map(); // "col/id" or "col/id/sub/id" -> data
  let auto = 0;
  const calls = { runTransaction: 0, queries: [] };

  const snap = (path) => {
    const has = store.has(path);
    return { id: path.split('/').pop(), ref: {path}, exists: has, data: () => (has ? store.get(path) : undefined) };
  };

  function docRef(path) {
    return {
      id: path.split('/').pop(),
      path,
      async get() { return snap(path); },
      async set(data, opts) {
        const enc = encode(data);
        store.set(path, opts?.merge ? { ...(store.get(path) ?? {}), ...enc } : enc);
      },
      async update(patch) {
        if (!store.has(path)) throw new Error(`NOT_FOUND: ${path}`);
        store.set(path, { ...store.get(path), ...encode(patch) });
      },
      async delete() { store.delete(path); },
      collection: (n) => colRef(`${path}/${n}`),
    };
  }

  function colRef(path, wheres = [], order = null, lim = null, cursor = null) {
    const q = {
      doc: (id) => docRef(`${path}/${id ?? `auto${++auto}`}`),
      async add(data) { const r = q.doc(); await r.set(data); return r; },
      where: (f, op, v) => colRef(path, [...wheres, [f, op, v]], order, lim, cursor),
      orderBy: (f, dir = 'asc') => colRef(path, wheres, [f, dir], lim, cursor),
      limit: (n) => colRef(path, wheres, order, n, cursor),
      startAfter: (snapshot) => colRef(path, wheres, order, lim, snapshot.ref.path),
      async get() {
        calls.queries.push({ path, wheres, order, limit: lim });
        const depth = path.split('/').length + 1;
        let rows = [...store.entries()]
          .filter(([p]) => p.startsWith(`${path}/`) && p.split('/').length === depth)
          .filter(([, d]) => wheres.every(([f, op, v]) => {
            const x = raw(d[f]); const y = raw(v);
            return op === '==' ? x === y : op === '>=' ? x >= y : op === '<=' ? x <= y : false;
          }));
        if (order) {
          const [f, dir] = order;
          rows.sort(([, a], [, b]) => (raw(a[f]) < raw(b[f]) ? -1 : raw(a[f]) > raw(b[f]) ? 1 : 0) * (dir === 'desc' ? -1 : 1));
        }
        if (cursor) rows = rows.slice(rows.findIndex(([p]) => p === cursor) + 1);
        if (lim != null) rows = rows.slice(0, lim);
        return { size: rows.length, docs: rows.map(([p]) => snap(p)), empty: rows.length === 0 };
      },
    };
    return q;
  }

  return {
    calls,
    store,
    collection: (n) => colRef(n),
    batch() {
      const writes = [];
      const batch = {
        set(ref, data, options) { writes.push({ ref, data, options }); return batch; },
        async commit() {
          // Validate every write before applying any, as an atomic batch would.
          for (const { data } of writes) encode(data);
          await Promise.all(writes.map(({ ref, data, options }) => ref.set(data, options)));
        },
      };
      return batch;
    },
    async runTransaction(fn) {
      calls.runTransaction++;
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, d, o) => ref.set(d, o),
        update: (ref, p) => ref.update(p),
        delete: (ref) => ref.delete(),
      };
      return fn(tx);
    },
  };
}
