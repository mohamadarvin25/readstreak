import { describe, expect, it } from 'vitest'
import { applyOps, compact, Outbox, type ExecResult, type Op } from './outbox'

let n = 0
const id = () => `op${++n}`
const insert = (table: Op['table'], row: Record<string, unknown> & { id: string }): Op => ({ opId: id(), kind: 'insert', table, row })
const update = (table: Op['table'], rowId: string, fields: Record<string, unknown>): Op => ({ opId: id(), kind: 'update', table, id: rowId, fields })
const del = (table: Op['table'], rowId: string): Op => ({ opId: id(), kind: 'delete', table, id: rowId })

const memoryStorage = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('compact', () => {
  it('merges an update into a queued insert', () => {
    const ops = compact([insert('books', { id: 'b1', title: 'A', status: 'reading' })], update('books', 'b1', { status: 'finished' }))
    expect(ops).toHaveLength(1)
    expect(ops[0].kind === 'insert' && ops[0].row.status).toBe('finished')
  })

  it('queues an update to a row that already exists on the server', () => {
    expect(compact([], update('books', 'b1', { status: 'finished' }))).toHaveLength(1)
  })

  it('drops a queued insert when the row is deleted before syncing', () => {
    const ops = compact([insert('reading_sessions', { id: 's1' })], del('reading_sessions', 's1'))
    expect(ops).toEqual([])
  })

  it('unlinks queued sessions from a queued book that gets deleted', () => {
    const ops = compact(
      [insert('books', { id: 'b1' }), insert('reading_sessions', { id: 's1', book_id: 'b1' })],
      del('books', 'b1'),
    )
    expect(ops).toHaveLength(1)
    expect(ops[0].kind === 'insert' && ops[0].row.book_id).toBeNull()
  })

  it('keeps a delete for rows that exist on the server, replacing earlier updates', () => {
    const ops = compact([update('books', 'b1', { title: 'x' })], del('books', 'b1'))
    expect(ops.map((o) => o.kind)).toEqual(['delete'])
  })

  it('never modifies the op that is being sent', () => {
    const inflight = insert('books', { id: 'b1', status: 'reading' })
    const ops = compact([inflight], update('books', 'b1', { status: 'finished' }), inflight.opId)
    expect(ops).toHaveLength(2)
    expect(ops[0]).toBe(inflight)
  })
})

describe('applyOps', () => {
  it('shows queued inserts, updates and deletes on top of server rows', () => {
    const server = [{ id: 'b1', title: 'A' }, { id: 'b2', title: 'B' }]
    const rows = applyOps(server, [insert('books', { id: 'b3', title: 'C' }), update('books', 'b1', { title: 'A2' }), del('books', 'b2')], 'books', true)
    expect(rows).toEqual([{ id: 'b1', title: 'A2' }, { id: 'b3', title: 'C', pending: true }])
  })
})

describe('Outbox.flush', () => {
  it('sends ops in order and empties the queue', async () => {
    const sent: string[] = []
    const box = new Outbox('k', async (op) => (sent.push(op.opId), { ok: true }), memoryStorage())
    const a = insert('books', { id: 'b1' })
    const b = insert('reading_sessions', { id: 's1', book_id: 'b1' })
    box.add(a)
    box.add(b)
    expect(await box.flush()).toBe(2)
    expect(sent).toEqual([a.opId, b.opId])
    expect(box.getSnapshot().ops).toEqual([])
  })

  it('keeps everything when offline, without reporting an error', async () => {
    const box = new Outbox('k', async () => ({ ok: false, network: true, message: 'Failed to fetch' }), memoryStorage())
    box.add(insert('reading_sessions', { id: 's1' }))
    expect(await box.flush()).toBe(0)
    expect(box.getSnapshot()).toMatchObject({ lastError: null, syncing: false })
    expect(box.getSnapshot().ops).toHaveLength(1)
  })

  it('stops at a server error and reports it', async () => {
    const results: ExecResult[] = [{ ok: true }, { ok: false, network: false, message: 'violates check constraint' }]
    const box = new Outbox('k', async () => results.shift()!, memoryStorage())
    box.add(insert('reading_sessions', { id: 's1' }))
    box.add(insert('reading_sessions', { id: 's2' }))
    box.add(insert('reading_sessions', { id: 's3' }))
    expect(await box.flush()).toBe(1)
    expect(box.getSnapshot().lastError).toBe('violates check constraint')
    expect(box.getSnapshot().ops).toHaveLength(2)
    box.discardFirst()
    expect(box.getSnapshot().ops).toHaveLength(1)
  })

  it('does not lose a change made while an op is being sent', async () => {
    let release!: () => void
    const box = new Outbox('k', () => new Promise<ExecResult>((r) => (release = () => r({ ok: true }))), memoryStorage())
    box.add(insert('books', { id: 'b1', status: 'reading' }))
    const flushing = box.flush()
    box.add(update('books', 'b1', { status: 'finished' }))
    release()
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    release()
    await flushing
    expect(box.getSnapshot().ops).toEqual([])
  })

  it('survives a reload through storage', () => {
    const storage = memoryStorage()
    new Outbox('k', async () => ({ ok: true }), storage).add(insert('books', { id: 'b1' }))
    expect(new Outbox('k', async () => ({ ok: true }), storage).getSnapshot().ops).toHaveLength(1)
  })
})
