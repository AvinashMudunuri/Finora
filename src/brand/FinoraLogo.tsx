export type FinoraLogoProps = {
  variant?: "full" | "mark";
};

export function FinoraLogo({ variant = "full" }: FinoraLogoProps) {
  return (
    <span className={variant === "mark" ? "brand-lockup is-compact" : "brand-lockup"}>
      <img
        className="brand-wordmark"
        src="/brand/finora-wordmark.png"
        alt=""
        height={40}
      />
      <img
        className="brand-mark"
        src="/brand/finora-f-mark.png"
        alt=""
        width={40}
        height={40}
      />
      <span className="visually-hidden">Finora</span>
    </span>
  );
}
