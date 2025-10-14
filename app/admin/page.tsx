"use client";

import { useSession } from "next-auth/react";
import { UpdateUsernameReferencesScript } from "@/components/admin/UpdateUsernameReferencesScript";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const { data: session } = useSession();

  // You could add a proper admin check here
  const isAuthorized = !!session?.user;

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
  <p className="text-muted-foreground">You don&rsquo;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Database management and maintenance tools
      </p>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Migrations</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateUsernameReferencesScript />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}