import Link from "next/link";
import { googleFontsHref } from "@/lib/languages";
import { allPairingFonts } from "@/lib/design";

/** Header + the full font set for creation pages (guest pages load only what they need). */
export default function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={googleFontsHref(["Inter", ...allPairingFonts()])} />
      <header className="topbar">
        <div className="container">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ❦
            </span>
            Wedding Cards
          </Link>
          <nav className="nav">
            {children ?? (
              <>
                <Link href="/templates">Templates</Link>
                <Link href="/create/ai">Create with AI</Link>
                <Link href="/my-cards">My cards</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
