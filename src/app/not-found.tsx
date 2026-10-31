import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container empty">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>We couldn&apos;t find that invitation</h1>
      <p>Please check the link, or ask the couple to share it again.</p>
      <Link className="btn" href="/">
        Go to the home page
      </Link>
    </main>
  );
}
