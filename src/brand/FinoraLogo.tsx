export function FinoraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <img
      className={compact ? "brand-wordmark brand-wordmark-compact" : "brand-wordmark"}
      src="/brand/finora-wordmark.png"
      alt="Finora"
      height={compact ? 28 : 40}
    />
  );
}
