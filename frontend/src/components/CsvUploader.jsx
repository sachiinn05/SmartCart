import FileDrop from './FileDrop.jsx'

export default function CsvUploader({ title, hint, onLoad, fileName }) {
  function handleFile(file) {
    const reader = new FileReader()
    reader.onload = (evt) => onLoad(evt.target.result, file.name)
    reader.readAsText(file)
  }

  return <FileDrop title={title} hint={hint} accept=".csv" fileName={fileName} onFile={handleFile} />
}
