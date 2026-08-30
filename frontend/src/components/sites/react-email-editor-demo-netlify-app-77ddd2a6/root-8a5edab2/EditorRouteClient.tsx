"use client";

import dynamic from "next/dynamic";

const EmailEditorPage = dynamic(
  () => import("./EmailEditorPage").then((m) => m.EmailEditorPage),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          color: "#666",
        }}
      >
        Loading editor…
      </div>
    ),
  },
);

export function EditorRouteClient({ templateId }: { templateId?: string }) {
  return <EmailEditorPage templateId={templateId} />;
}
