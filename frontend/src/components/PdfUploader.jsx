/**
 * PdfUploader.jsx
 *
 * Upload a cart PDF. The file is parsed by the backend; the parent decides what to do
 * with the resulting CartItem[] (it replaces the cart).
 */

import { useRef, useState } from 'react'
import { parseCartFromPdf } from '../inputs/pdfInput.js'

export default function PdfUploader({ rules, cartItems, onItems, onErrors }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setLoading(true)
    try {
      const { items, errors } = await parseCartFromPdf(file, rules, cartItems)
      onErrors(errors)
      if (items.length > 0) {
        onItems(items, file.name)
        setFileName(file.name)
      }
      // No valid rows: keep the current cart rather than replacing it with nothing.
    } catch (err) {
      onErrors([err.message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      style={{ marginTop: 8, border: '2px dashed #CECECE', borderRadius: 6, padding: '0.7rem 1.2rem', background: '#fafafa', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
    >
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
      <span style={{ fontSize: 20 }}>📑</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#131A48' }}>Cart PDF</div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {loading ? 'Reading PDF…' : fileName || 'Replaces the cart. Columns: Product, Brand, Platform, Base Price'}
        </div>
      </div>
      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#FF5800', textTransform: 'uppercase' }}>Upload</span>
    </div>
  )
}
