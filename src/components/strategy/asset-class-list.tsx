"use client";

/**
 * Asset Class List Component
 *
 * Story 4.1: Define Asset Classes
 *
 * Displays a list of asset classes with CRUD operations.
 * AC-4.1.1: View list of asset classes
 * AC-4.1.2: Create asset class with name and optional icon
 * AC-4.1.3: Edit asset class name
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 */

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssetClasses } from "@/hooks/use-asset-classes";
import { AssetClassCard } from "./asset-class-card";
import { AssetClassForm } from "./asset-class-form";

export function AssetClassList() {
  const { assetClasses, isLoading, error, canCreate, limit, refresh } = useAssetClasses();
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Handle successful create
  const handleCreateSuccess = () => {
    setIsAddingNew(false);
    refresh();
  };

  // Handle cancel
  const handleCancel = () => {
    setIsAddingNew(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Classes</CardTitle>
          <CardDescription>Loading your asset classes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Classes</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  const isEmpty = assetClasses.length === 0 && !isAddingNew;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Asset Classes</CardTitle>
          <CardDescription>
            {assetClasses.length} of {limit} asset classes
          </CardDescription>
        </div>
        {canCreate && !isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No asset classes yet</p>
            <Button onClick={() => setIsAddingNew(true)} variant="link" className="mt-2">
              Create your first asset class
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* New asset class form */}
            {isAddingNew && (
              <AssetClassForm onSuccess={handleCreateSuccess} onCancel={handleCancel} />
            )}

            {/* Existing asset classes */}
            {assetClasses.map((assetClass) => (
              <AssetClassCard
                key={assetClass.id}
                assetClass={assetClass}
                onUpdate={refresh}
                onDelete={refresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
