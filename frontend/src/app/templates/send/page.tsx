"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SendTestPage } from "@/components/sites/react-email-editor-demo-netlify-app-77ddd2a6/root-8a5edab2/SendTestPage";

function SendPageInner() {
  const id = useSearchParams().get("id") ?? "";
  return <SendTestPage templateId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SendPageInner />
    </Suspense>
  );
}
