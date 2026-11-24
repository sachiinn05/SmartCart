export default function ErrorBanner({ errors, title }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="alert red">
      <strong>{title ?? `${errors.length} problem${errors.length > 1 ? 's' : ''} found`}</strong>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  )
}
