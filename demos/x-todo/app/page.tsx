import { Header } from "@/components/header";
import { AddTodoForm } from "@/components/add-todo-form";
import { TodoList } from "@/components/todo-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodos } from "./actions";
import { isConfigured, canWrite } from "@/lib/db";
import { AlertCircle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = isConfigured();
  const writeEnabled = canWrite();
  const result = configured ? await getTodos() : null;

  return (
    <div className="min-h-screen">
      <Header isConfigured={configured} canWrite={writeEnabled} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!configured ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Info className="h-5 w-5" />
                Configuration Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-700 space-y-4">
              <p>
                To use this demo, you need to configure your X (Twitter) connection.
                Create a <code className="bg-amber-100 px-1 rounded">.env.local</code> file with:
              </p>
              <pre className="bg-amber-100 p-3 rounded-lg text-sm overflow-x-auto">
{`TWEET_ID=your_tweet_id
BEARER_TOKEN=your_bearer_token
OAUTH_ACCESS_TOKEN=your_oauth_token`}
              </pre>
              <p className="text-sm">
                Get your API credentials from the{" "}
                <a
                  href="https://developer.x.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900"
                >
                  X Developer Portal
                </a>
                . See the README for detailed instructions.
              </p>
            </CardContent>
          </Card>
        ) : result && !result.success ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Loading TODOs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-destructive/80">
              <p>{result.error}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add TODO</CardTitle>
              </CardHeader>
              <CardContent>
                <AddTodoForm disabled={!configured || !writeEnabled} />
                {!writeEnabled && configured && (
                  <p className="text-xs text-amber-600 mt-2">
                    Read-only mode. Set OAUTH_ACCESS_TOKEN to enable writing.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your TODOs</CardTitle>
              </CardHeader>
              <CardContent>
                <TodoList todos={result?.data ?? []} readOnly={!writeEnabled} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built with{" "}
            <a
              href="https://github.com/cwdaniel/replydb"
              className="underline hover:text-foreground"
            >
              ReplyDB
            </a>{" "}
            - A database where replies are writes
          </p>
        </div>
      </footer>
    </div>
  );
}
