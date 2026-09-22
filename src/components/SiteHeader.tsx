import { useEffect, useId, useRef, useState } from "react";
import { FinoraLogo } from "../brand/FinoraLogo.tsx";
import {
  MOBILE_NAV_MEDIA_QUERY,
  PRIMARY_NAVIGATION,
  type AppView,
} from "../navigation/primary.ts";

export type { AppView };

type SiteHeaderProps = {
  current: AppView;
  systemNotice?: string;
  onShowDashboard: () => void;
  onShowAccounts?: () => void;
  onShowCards: () => void;
  onShowTransactions: () => void;
  onShowSpending?: () => void;
  onShowInsights?: () => void;
};

function useMobilePresentation(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(MOBILE_NAV_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(MOBILE_NAV_MEDIA_QUERY);
    const sync = () => {
      setIsMobile(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  return isMobile;
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) {
    return;
  }
  if (dialog.open && typeof dialog.close === "function") {
    dialog.close();
  }
  dialog.removeAttribute("open");
}

/** Each destination remounts SiteHeader. Remember to focus the new Menu button. */
let restoreTriggerFocus = false;

export function SiteHeader({
  current,
  systemNotice,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowInsights,
}: SiteHeaderProps) {
  const isMobile = useMobilePresentation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();

  const actions: Record<AppView, (() => void) | undefined> = {
    dashboard: onShowDashboard,
    accounts: onShowAccounts,
    cards: onShowCards,
    transactions: onShowTransactions,
    spending: onShowSpending,
    insights: onShowInsights,
  };

  function closeMenu(): void {
    closeDialog(dialogRef.current);
    setMenuOpen(false);
    restoreTriggerFocus = true;
    triggerRef.current?.focus();
    window.setTimeout(() => {
      if (
        restoreTriggerFocus &&
        triggerRef.current &&
        document.contains(triggerRef.current)
      ) {
        restoreTriggerFocus = false;
      }
    }, 0);
  }

  useEffect(() => {
    if (!restoreTriggerFocus || !isMobile) {
      return;
    }
    restoreTriggerFocus = false;
    triggerRef.current?.focus();
  }, [isMobile]);

  function openMenu(): void {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    } else {
      dialog?.setAttribute("open", "");
    }
    setMenuOpen(true);
  }

  if (!isMobile && menuOpen) {
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function selectView(view: AppView): void {
    actions[view]?.();
    closeMenu();
  }

  return (
    <header className="site-header">
      {isMobile ? (
        <div className="mobile-header">
          <p className="brand-name">
            <FinoraLogo compact />
          </p>
          <button
            ref={triggerRef}
            type="button"
            className="menu-trigger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls={panelId}
            onClick={() => {
              openMenu();
            }}
          >
            Menu
          </button>
        </div>
      ) : (
        <>
          <div className="brand">
            <p className="brand-name">
              <FinoraLogo />
            </p>
            <p className="brand-tagline">Your financial life, clearly connected</p>
          </div>
          <nav className="site-nav" aria-label="Primary">
            {PRIMARY_NAVIGATION.map((item) => (
              <button
                key={item.view}
                type="button"
                className={
                  current === item.view
                    ? "site-nav-button is-active"
                    : "site-nav-button"
                }
                aria-current={current === item.view ? "page" : undefined}
                onClick={() => {
                  selectView(item.view);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}

      {isMobile ? (
        <dialog
          ref={dialogRef}
          className="mobile-nav-dialog"
          aria-labelledby={`${panelId}-title`}
          onClose={() => {
            setMenuOpen(false);
          }}
          onCancel={() => {
            setMenuOpen(false);
          }}
          onClick={(event) => {
            if (event.target === dialogRef.current) {
              closeMenu();
            }
          }}
        >
          <div className="mobile-nav-panel" id={panelId}>
            <div className="mobile-nav-panel-header">
              <h2 id={`${panelId}-title`} className="mobile-nav-title">
                Menu
              </h2>
              <button
                type="button"
                className="menu-close"
                aria-label="Close menu"
                onClick={() => {
                  closeMenu();
                }}
              >
                Close
              </button>
            </div>
            <nav className="mobile-nav" aria-label="Primary">
              {PRIMARY_NAVIGATION.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={
                    current === item.view
                      ? "mobile-nav-button is-active"
                      : "mobile-nav-button"
                  }
                  aria-current={current === item.view ? "page" : undefined}
                  onClick={() => {
                    selectView(item.view);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </dialog>
      ) : null}

      {systemNotice ? (
        <p className="field-error" role="alert">
          {systemNotice}
        </p>
      ) : null}
    </header>
  );
}
