import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AiFlow from "./AiFlow";

export const metadata: Metadata = { title: "Create with AI" };

export default function Page() {
  return (
    <>
      <AppHeader />
      <main className="container" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <h1>Create with AI</h1>
          <p className="muted">Fill in the basics, then tell us about the two of you. We&apos;ll design the page and write the invitation, and you can change anything afterwards.</p>
        </div>
        <AiFlow />
      </main>
    </>
  );
}
