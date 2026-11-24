import { useState } from 'react'
import FileDrop from './FileDrop.jsx'
import { parseCartFromPdf } from '../inputs/pdfInput.js'

export default function PdfUploader({ rules, cartItems, onItems, onErrors }) {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(file) {
    setLoading(true)
    try {
      const { items, errors } = await parseCartFromPdf(file, rules, cartItems)
      onErrors(errors)
      if (items.length > 0) {
        onItems(items, file.name)
        setFileName(file.name)
      }
    } catch (err) {
      onErrors([err.message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <FileDrop
      title="Upload an order PDF"
      hint="Table with Product, Brand, Platform, Base Price"
      accept=".pdf,application/pdf"
      fileName={fileName}
      busy={loading}
      onFile={handleFile}
    />
  )
}
