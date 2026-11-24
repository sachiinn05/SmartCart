import { useRef, useState } from 'react'
import { parseCartFromPdf } from '../inputs/pdfInput.js'

export default function PdfUploader({ rules, cartItems, onItems, onErrors }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setLoading(true)
    try {
      const { items, errors } = await parseCartFromPdf(file, rules, cartItems)
      onErrors(errors)
      if (items.length > 0) onItems(items, file.name)
    } catch (err) {
      onErrors([err.message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="file-row">
      <button type="button" className="btn" disabled={loading} onClick={() => inputRef.current?.click()}>
        {loading ? 'Reading PDF...' : 'Upload cart.pdf'}
      </button>
      <span className="name">replaces the current cart</span>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" hidden onChange={handleFile} />
    </div>
  )
}
