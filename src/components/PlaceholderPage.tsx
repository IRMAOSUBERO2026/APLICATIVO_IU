import { AppLayout } from "@/components/layout/AppLayout";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
          <Construction className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground">Módulo em desenvolvimento</p>
      </div>
    </AppLayout>
  );
}
