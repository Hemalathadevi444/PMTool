export function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 4L8 14v20l16 10 16-10V14L24 4z"
        fill="url(#logoGrad1)"
      />
      <path
        d="M24 12L14 18v12l10 6 10-6V18L24 12z"
        fill="url(#logoGrad2)"
        opacity="0.9"
      />
      <defs>
        <linearGradient id="logoGrad1" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6EB4" />
          <stop offset="0.5" stopColor="#7B68EE" />
          <stop offset="1" stopColor="#FFB347" />
        </linearGradient>
        <linearGradient id="logoGrad2" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB347" />
          <stop offset="1" stopColor="#7B68EE" />
        </linearGradient>
      </defs>
    </svg>
  )
}
