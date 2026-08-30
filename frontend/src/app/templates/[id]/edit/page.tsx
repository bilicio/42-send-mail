import { EditorRouteClient } from "@/components/sites/react-email-editor-demo-netlify-app-77ddd2a6/root-8a5edab2/EditorRouteClient";

export default function Page({ params }: { params: { id: string } }) {
  return <EditorRouteClient templateId={params.id} />;
}
