import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          Here are your investment recommendations for this month.
        </p>
      </div>

      {/* Placeholder metrics row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Focus Mode - Recommendations placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your personalized investment recommendations will appear here.
          </p>
          {/* Skeleton recommendation cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="mt-1 h-3 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
