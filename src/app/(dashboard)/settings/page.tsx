import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getSafeUserById } from "@/lib/auth/service";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ExportDataSection } from "@/components/settings/export-data-section";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account and preferences.",
};

/**
 * Settings Page
 *
 * Story 2.6: Profile Settings & Base Currency
 * Story 2.7: Data Export
 * Story 2.8: Account Deletion
 *
 * Server component that fetches user data and renders the profile form.
 * AC-2.6.1: Settings page shows name and base currency fields
 * AC-2.7.1: Export button on Settings page
 * AC-2.8.1: Delete Account button styled as destructive action
 */
export default async function SettingsPage() {
  // Get access token from cookies
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  // Verify token and get user ID
  let userId: string;
  try {
    const payload = await verifyAccessToken(accessToken);
    userId = payload.userId;
  } catch {
    redirect("/login");
  }

  // Fetch user data
  const user = await getSafeUserById(userId);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <ProfileSettingsForm
        initialData={{
          name: user.name,
          baseCurrency: user.baseCurrency,
        }}
      />

      {/* Story 2.7: Data Export */}
      <ExportDataSection />

      {/* Story 2.8: Account Deletion */}
      <DeleteAccountDialog />
    </div>
  );
}
