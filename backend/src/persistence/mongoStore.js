/**
 * mongoStore.js - optional MongoDB persistence.
 *
 * Every store (this one, or the in-memory one used in tests) exposes the same interface,
 * so routes never know which is behind them:
 *
 *   getState(sid)            -> { rules, cartItems }
 *   saveRules(sid, rules)
 *   saveCart(sid, items)
 *   addHistory(sid, entry)
 *   listHistory(sid, limit)  -> entry[]  (newest first)
 *   clear(sid)
 *
 * `sid` is an anonymous per-browser id, so visitors to a public deployment never see each other's data.
 * Documents expire after 30 days (TTL index), so nothing is kept indefinitely.
 */

import mongoose from 'mongoose'

const THIRTY_DAYS = 60 * 60 * 24 * 30
const HISTORY_LIMIT = 50

const stateSchema = new mongoose.Schema(
  {
    sid: { type: String, required: true, unique: true },
    rules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cartItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    updatedAt: { type: Date, default: Date.now, expires: THIRTY_DAYS },
  },
  { versionKey: false }
)

const historySchema = new mongoose.Schema(
  {
    sid: { type: String, required: true, index: true },
    itemCount: Number,
    subtotal: Number,
    cartOffer: mongoose.Schema.Types.Mixed,
    finalTotal: Number,
    items: [mongoose.Schema.Types.Mixed],
    createdAt: { type: Date, default: Date.now, expires: THIRTY_DAYS },
  },
  { versionKey: false }
)

export async function createMongoStore(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  const State = mongoose.models.State || mongoose.model('State', stateSchema)
  const History = mongoose.models.History || mongoose.model('History', historySchema)
  await Promise.all([State.init(), History.init()])

  const touch = (sid, fields) =>
    State.updateOne({ sid }, { $set: { ...fields, updatedAt: new Date() } }, { upsert: true })

  return {
    kind: 'mongo',

    async getState(sid) {
      const doc = await State.findOne({ sid }).lean()
      return { rules: doc?.rules ?? [], cartItems: doc?.cartItems ?? [] }
    },
    saveRules: (sid, rules) => touch(sid, { rules }),
    saveCart: (sid, cartItems) => touch(sid, { cartItems }),

    async addHistory(sid, entry) {
      await History.create({ sid, ...entry })
      // keep only the newest HISTORY_LIMIT entries per visitor
      const old = await History.find({ sid }).sort({ createdAt: -1 }).skip(HISTORY_LIMIT).select('_id').lean()
      if (old.length) await History.deleteMany({ _id: { $in: old.map((d) => d._id) } })
    },

    async listHistory(sid, limit = 20) {
      const docs = await History.find({ sid }).sort({ createdAt: -1 }).limit(limit).lean()
      return docs.map(({ _id, sid: _s, ...rest }) => ({ id: String(_id), ...rest }))
    },

    async clear(sid) {
      await Promise.all([State.deleteOne({ sid }), History.deleteMany({ sid })])
    },

    async close() {
      await mongoose.disconnect()
    },
  }
}
