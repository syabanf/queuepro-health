import React from "react";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import PageHeader from "./PageHeader";

export default function PlaceholderPage({ title, subtitle, icon }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} icon={icon} />
      <Card className="border-dashed border-2 border-border bg-muted/30">
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-5">
            <Construction className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/70 mb-2">Segera Hadir</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Halaman ini sedang dalam tahap pengembangan dan akan tersedia pada fase berikutnya.
          </p>
        </div>
      </Card>
    </div>
  );
}