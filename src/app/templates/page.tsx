import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import TemplateGallery from "./TemplateGallery";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <>
      <AppHeader />
      <main className="container">
        <div className="page-head">
          <h1>Choose a template</h1>
          <p className="muted">Filter by tradition or colour. Tap any design for a full desktop and mobile preview.</p>
        </div>
        <TemplateGallery />
      </main>
    </>
  );
}
