import { Badge } from "@/components/ui/badge";
import { Database, MessageCircle } from "lucide-react";

interface HeaderProps {
  isConfigured: boolean;
}

export function Header({ isConfigured }: HeaderProps) {
  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Threads TODO</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              Powered by ReplyDB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Connected" : "Not Configured"}
          </Badge>
          {!isConfigured && (
            <span className="text-xs text-muted-foreground">
              Set environment variables to connect to Threads
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
