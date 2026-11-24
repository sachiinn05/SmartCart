import 'dotenv/config'
import { createApp } from './src/app.js'
import { createMongoStore } from './src/persistence/mongoStore.js'

const PORT = process.env.PORT || 3001

let store = null
if (process.env.MONGODB_URI) {
  try {
    store = await createMongoStore(process.env.MONGODB_URI)
    console.log('MongoDB connected: rules, cart and history will be saved')
  } catch (err) {
    console.error(`MongoDB unavailable (${err.message}); continuing in-memory`)
  }
}

createApp(store).listen(PORT, () => {
  const llm = process.env.GROQ_API_KEY ? '' : ' (no GROQ_API_KEY: rule parsing uses the keyword fallback)'
  console.log(`SmartCart running on :${PORT}${llm}`)
})
