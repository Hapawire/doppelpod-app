import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 px-4 py-8">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link href="/#features" className="transition-colors hover:text-foreground">Features</Link>
          <Link href="/#pricing" className="transition-colors hover:text-foreground">Pricing</Link>
          <Link href="/#demo" className="transition-colors hover:text-foreground">Demo</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/cookie-policy" className="transition-colors hover:text-foreground">Cookies</Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
            <circle cx="12" cy="15" r="2" />
          </svg>
          Powered by Hapawire
        </div>
        <p className="text-xs">
          &copy; {new Date().getFullYear()} DoppelPod. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
