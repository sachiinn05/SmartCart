export function createMemoryStore() {
  const states = new Map()
  const histories = new Map()
  return {
    kind: 'memory',
    async getState(sid) {
      const s = states.get(sid)
      return { rules: s?.rules ?? [], cartItems: s?.cartItems ?? [] }
    },
    async saveRules(sid, rules) {
      states.set(sid, { ...(states.get(sid) ?? {}), rules })
    },
    async saveCart(sid, cartItems) {
      states.set(sid, { ...(states.get(sid) ?? {}), cartItems })
    },
    async addHistory(sid, entry) {
      const list = histories.get(sid) ?? []
      list.unshift({ id: String(Date.now() + list.length), createdAt: new Date().toISOString(), ...entry })
      histories.set(sid, list.slice(0, 50))
    },
    async listHistory(sid, limit = 20) {
      return (histories.get(sid) ?? []).slice(0, limit)
    },
    async clear(sid) {
      states.delete(sid)
      histories.delete(sid)
    },
  }
}
