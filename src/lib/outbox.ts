// Offline-first writes. Every change is queued here (and saved to localStorage) first,
// shown in the UI right away, and sent to Supabase in order whenever we're online.

export type Table = 'books' | 'reading_sessions'
type Row = Record<string, unknown> & { id: string }

export type Op =
  | { opId: string; kind: 'insert'; table: Table; row: Row }
  | { opId: string; kind: 'update'; table: Table; id: string; fields: Record<string, unknown> }
  | { opId: string; kind: 'delete'; table: Table; id: string }

export type ExecResult = { ok: true } | { ok: false; network: boolean; message: string }
export type Executor = (op: Op) => Promise<ExecResult>

const targetId = (op: Op) => (op.kind === 'insert' ? op.row.id : op.id)

/**
 * Appends `op`, folding it into earlier queued ops where it can:
 * an update to a row that is still waiting to be inserted is merged into the insert, and
 * deleting such a row drops it entirely, so it never reaches the server.
 * `frozenOpId` is an op being sent right now; it is never modified.
 */
export function compact(ops: Op[], op: Op, frozenOpId?: string): Op[] {
  const queuedInsert = ops.find(
    (o): o is Extract<Op, { kind: 'insert' }> =>
      o.kind === 'insert' && o.table === op.table && o.row.id === targetId(op) && o.opId !== frozenOpId,
  )

  if (op.kind === 'update' && queuedInsert) {
    return ops.map((o) => (o === queuedInsert ? { ...queuedInsert, row: { ...queuedInsert.row, ...op.fields } } : o))
  }

  if (op.kind === 'delete') {
    // Earlier queued changes to this row are pointless now (the in-flight op is left alone).
    let next = ops.filter((o) => o.opId === frozenOpId || !(o.table === op.table && targetId(o) === op.id))
    if (queuedInsert) {
      if (op.table === 'books') {
        // Sessions still waiting to be created can't point at a book that will never exist.
        next = next.map((o) =>
          o.kind === 'insert' && o.table === 'reading_sessions' && o.row.book_id === op.id && o.opId !== frozenOpId
            ? { ...o, row: { ...o.row, book_id: null } }
            : o,
        )
      }
      return next
    }
    return [...next, op]
  }

  return [...ops, op]
}

/** Applies queued ops to rows from the server, to show the result before it is synced. */
export function applyOps<T extends { id: string }>(rows: T[], ops: Op[], table: Table, markPending: boolean): T[] {
  let out = rows
  for (const op of ops) {
    if (op.table !== table) continue
    if (op.kind === 'insert') {
      if (!out.some((r) => r.id === op.row.id)) out = [...out, { ...(op.row as unknown as T), ...(markPending ? { pending: true } : {}) }]
    } else if (op.kind === 'update') {
      out = out.map((r) => (r.id === op.id ? { ...r, ...op.fields } : r))
    } else {
      out = out.filter((r) => r.id !== op.id)
    }
  }
  return out
}

export interface OutboxState {
  ops: Op[]
  /** Last non-network error; the queue stops at that op until it's retried or discarded. */
  lastError: string | null
  syncing: boolean
}

type MiniStorage = Pick<Storage, 'getItem' | 'setItem'>

export class Outbox {
  private state: OutboxState
  private listeners = new Set<() => void>()
  private inFlight: string | undefined

  constructor(
    private readonly key: string,
    private readonly exec: Executor,
    private readonly storage: MiniStorage | null,
  ) {
    let ops: Op[] = []
    try {
      const raw = storage?.getItem(key)
      if (raw) ops = JSON.parse(raw) as Op[]
    } catch {
      // unreadable storage: start empty
    }
    this.state = { ops, lastError: null, syncing: false }
  }

  getSnapshot = (): OutboxState => this.state

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private set(patch: Partial<OutboxState>) {
    this.state = { ...this.state, ...patch }
    if (patch.ops) {
      try {
        this.storage?.setItem(this.key, JSON.stringify(this.state.ops))
      } catch {
        // storage full or blocked: the queue still works for this session
      }
    }
    this.listeners.forEach((fn) => fn())
  }

  add(op: Op) {
    this.set({ ops: compact(this.state.ops, op, this.inFlight) })
  }

  /** Drops the op that keeps failing, so the rest of the queue can sync. */
  discardFirst() {
    this.set({ ops: this.state.ops.slice(1), lastError: null })
  }

  /**
   * Sends queued ops one by one, oldest first. Stops at the first failure and keeps
   * that op for later. `onSynced` runs before each op leaves the queue.
   * Returns how many ops were synced.
   */
  async flush(onSynced?: (op: Op) => void): Promise<number> {
    if (this.state.syncing || this.state.ops.length === 0) return 0
    this.set({ syncing: true })
    let synced = 0
    try {
      while (this.state.ops.length > 0) {
        const op = this.state.ops[0]
        this.inFlight = op.opId
        const result = await this.exec(op)
        this.inFlight = undefined
        if (!result.ok) {
          this.set({ lastError: result.network ? null : result.message })
          break
        }
        onSynced?.(op)
        synced++
        this.set({ ops: this.state.ops.filter((o) => o.opId !== op.opId), lastError: null })
      }
    } finally {
      this.inFlight = undefined
      this.set({ syncing: false })
    }
    return synced
  }
}
