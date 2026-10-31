import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import ShareKit from "./ShareKit";

export const metadata: Metadata = { title: "Share kit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AppHeader />
      <main className="container">
        <ShareKit id={id} />
      </main>
    </>
  );
}
