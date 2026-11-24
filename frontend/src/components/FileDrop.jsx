import { useRef, useState } from 'react'
import { UploadIcon, CheckIcon } from './icons.jsx'

export default function FileDrop({ title, hint, accept, fileName, busy, onFile }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  function pick(file) {
    if (file && !busy) onFile(file)
  }

  const state = fileName ? 'done' : over ? 'over' : ''

  return (
    <div
      className={`drop ${state}`}
      role="button"
      tabIndex={0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        pick(e.dataTransfer.files[0])
      }}
    >
      <span className="ico">{fileName ? <CheckIcon /> : <UploadIcon />}</span>
      <span className="txt">
        <span className="t">{busy ? 'Reading file...' : fileName || title}</span>
        <span className="h">{fileName ? 'Click or drop a new file to replace it' : hint}</span>
      </span>
      <span className="act">{fileName ? 'Replace' : 'Browse'}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          pick(e.target.files[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
