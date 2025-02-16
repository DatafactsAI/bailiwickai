
import { ZapierWebhookForm } from "@/components/ZapierWebhookForm";
import { ClientDataViewer } from "@/components/ClientDataViewer";

export default function Index() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientDataViewer />
      <ZapierWebhookForm />
    </div>
  );
}
