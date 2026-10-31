import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import MyCards from "./MyCards";

export const metadata: Metadata = { title: "My cards" };

export default function Page() {
  return (
    <>
      <AppHeader />
      <main className="container" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <h1>My cards</h1>
          <p className="muted">Cards you&apos;ve created in this browser.</p>
        </div>
        <MyCards />
      </main>
    </>
  );
}
