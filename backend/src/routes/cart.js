import { Router } from 'express'
import multer from 'multer'
import { extractPdfText, parseCartText } from '../services/pdfCartParser.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const hint = (v) => {
  try {
    const a = JSON.parse(v ?? '[]')
    return Array.isArray(a) ? a.map(String) : []
  } catch {
    return []
  }
}

// POST /api/parse-pdf   multipart: file=<pdf>, brands/platforms = JSON arrays (optional hints)
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded.' })
  const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')
  if (!isPdf) return res.status(400).json({ status: 'error', message: 'Please upload a PDF file.' })

  try {
    const text = await extractPdfText(req.file.buffer)
    const { items, errors } = parseCartText(text, {
      brands: hint(req.body.brands),
      platforms: hint(req.body.platforms),
    })
    res.json({ status: items.length ? 'ok' : 'empty', items, errors })
  } catch (err) {
    console.error('PDF parse failed:', err.message)
    res.status(422).json({ status: 'error', message: 'That file could not be read as a PDF.' })
  }
})

// multer errors (e.g. file too large)
router.use((err, _req, res, _next) => {
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'PDF is larger than 5 MB.' : 'Upload failed.'
  res.status(400).json({ status: 'error', message })
})

export default router
