"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EditorRouteClient } from "@/components/sites/react-email-editor-demo-netlify-app-77ddd2a6/root-8a5edab2/EditorRouteClient";

function EditPageInner() {
  const id = useSearchParams().get("id") ?? "";
  return <EditorRouteClient templateId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditPageInner />
    </Suspense>
  );
}
