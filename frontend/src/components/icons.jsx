const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const UploadIcon = () => (
  <svg {...base}>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </svg>
)

export const CheckIcon = () => (
  <svg {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...base} width="14" height="14">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const CartIcon = () => (
  <svg {...base} width="22" height="22">
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19.5" r="1.4" />
    <circle cx="17" cy="19.5" r="1.4" />
  </svg>
)

export const SparkIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
)
