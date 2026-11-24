import { Router } from 'express'
import { parseRuleText } from '../services/ruleParser.js'

const router = Router()

router.post('/parse-rule', async (req, res) => {
  const { text, context } = req.body ?? {}
  const list = (v) => (Array.isArray(v) ? v.map(String).slice(0, 100) : [])
  const ctx = { brands: list(context?.brands), platforms: list(context?.platforms) }
  try {
    res.json(await parseRuleText(text, ctx))
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'error', message: 'Could not parse the rule. Please try again.' })
  }
})

export default router
