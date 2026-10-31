import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import Editor from "./Editor";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AppHeader />
      <Editor id={id} />
    </>
  );
}
