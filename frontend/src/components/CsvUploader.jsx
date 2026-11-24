import { useRef } from 'react'

export default function CsvUploader({ label, onLoad, fileName }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => onLoad(evt.target.result, file.name)
    reader.readAsText(file)
  }

  return (
    <div className="file-row">
      <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
        {fileName ? 'Replace' : 'Upload'} {label}
      </button>
      <span className={`name ${fileName ? 'set' : ''}`}>{fileName || 'No file'}</span>
      <input ref={inputRef} type="file" accept=".csv" hidden onChange={handleFile} />
    </div>
  )
}
