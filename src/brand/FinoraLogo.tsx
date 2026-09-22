export function FinoraLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="brand-compact">
        <img
          className="brand-mark"
          src="/brand/finora-f-mark.png"
          alt=""
          height={28}
        />
        <img
          className="brand-wordmark brand-wordmark-compact"
          src="/brand/finora-wordmark.png"
          alt="Finora"
          height={28}
        />
      </span>
    );
  }

  return (
    <img
      className="brand-wordmark"
      src="/brand/finora-wordmark.png"
      alt="Finora"
      height={40}
    />
  );
}
