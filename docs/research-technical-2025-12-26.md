# Technical Research Report: Investments Planner

**Date:** 2025-12-26
**Prepared by:** Bmad
**Research Depth:** Technical Research Focus

---

## Executive Summary

This technical research evaluates the current technology stack, identifies best practices for implementing brainstorming ideas, and provides technical recommendations for the portfolio planning tool enhancements.

### Key Technical Insights

1. **Current stack is modern and well-chosen** - Next.js 16, React 19, Drizzle ORM, Tailwind 4
2. **Recharts already installed** - Can implement pie charts without new dependencies
3. **react-hook-form + Zod** - Ideal for form validation with real-time feedback
4. **i18n requires new library** - Recommend `next-intl` or `react-i18next`
5. **Server Components** - Use for data fetching, Client Components for interactivity

---

## 1. Current Technology Stack Analysis

### Dependencies Audit (from package.json)

| Category            | Technology               | Version  | Status                  |
| ------------------- | ------------------------ | -------- | ----------------------- |
| **Framework**       | Next.js                  | 16.0.10  | ✅ Cutting edge         |
| **React**           | React                    | 19.2.0   | ✅ Latest               |
| **ORM**             | Drizzle ORM              | 0.44.7   | ✅ Modern, type-safe    |
| **Database**        | PostgreSQL (postgres.js) | 3.4.7    | ✅ Recommended driver   |
| **Styling**         | Tailwind CSS             | 4.x      | ✅ Latest               |
| **UI Components**   | Radix UI                 | Various  | ✅ Accessible, headless |
| **Forms**           | react-hook-form          | 7.67.0   | ✅ Industry standard    |
| **Validation**      | Zod                      | 4.1.13   | ✅ Type-safe schemas    |
| **Charts**          | Recharts                 | 3.5.1    | ✅ Already installed!   |
| **Testing**         | Vitest + Playwright      | Latest   | ✅ Modern testing stack |
| **Background Jobs** | Inngest                  | 3.46.0   | ✅ Serverless-friendly  |
| **Email**           | Resend                   | 6.5.2    | ✅ Developer-friendly   |
| **Caching**         | Vercel KV                | 3.0.0    | ✅ Edge caching         |
| **Observability**   | OpenTelemetry            | 1.x      | ✅ Production-ready     |
| **Drag & Drop**     | dnd-kit                  | 6.x/10.x | ✅ Modern, accessible   |

### Stack Assessment

**Strengths:**

- Cutting-edge Next.js 16 with React 19 enables latest patterns (Server Components, Actions)
- Type-safe database layer with Drizzle ORM
- Recharts already installed - no new charting library needed
- Comprehensive testing setup (unit + E2E)
- Production observability with OpenTelemetry

**Gaps Identified:**

- No i18n library installed
- No number formatting utilities (regional decimals)

---

## 2. Implementation Recommendations by Feature

### Feature 1: Pie Chart Visualization

**Current State:** Recharts 3.5.1 already installed

**Implementation:**

```tsx
// src/components/portfolio/allocation-pie-chart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function AllocationPieChart({ holdings }: { holdings: Holding[] }) {
  const data = holdings.map((h) => ({
    name: h.symbol,
    value: h.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Effort:** Low - Recharts already available
**Sources:** [Recharts Documentation](https://recharts.org/)

---

### Feature 2: Real-Time Allocation Sum (% Remaining)

**Current State:** react-hook-form + Zod installed

**Implementation Pattern:**

```tsx
// Using react-hook-form's watch for real-time updates
const { watch, control } = useForm<PortfolioFormData>({
  resolver: zodResolver(portfolioSchema),
});

// Watch all allocation percentages
const allocations = watch("holdings");
const totalAllocation = allocations?.reduce((sum, h) => sum + (h.percentage || 0), 0) ?? 0;
const remaining = 100 - totalAllocation;

// Display in UI
<div
  className={cn(
    "text-sm font-medium",
    remaining === 0 ? "text-green-600" : remaining < 0 ? "text-red-600" : "text-yellow-600"
  )}
>
  {remaining === 0
    ? "✓ 100% allocated"
    : remaining > 0
      ? `${remaining}% remaining`
      : `${Math.abs(remaining)}% over-allocated`}
</div>;
```

**Zod Schema with 100% Validation:**

```typescript
const portfolioSchema = z
  .object({
    name: z.string().min(1),
    holdings: z.array(
      z.object({
        symbol: z.string(),
        percentage: z.number().min(1).max(100),
      })
    ),
  })
  .refine((data) => data.holdings.reduce((sum, h) => sum + h.percentage, 0) === 100, {
    message: "Total allocation must equal 100%",
    path: ["holdings"],
  });
```

**Effort:** Low - Uses existing libraries
**Sources:** [react-hook-form docs](https://react-hook-form.com/), [Tonyvu - RHF + Tailwind](https://www.tonyvu.co/posts/react-hook-form-tailwind-css/)

---

### Feature 3: Edit/Delete Portfolio (CRUD)

**Current State:** Drizzle ORM installed

**Implementation:**

Server Actions (Next.js 15+ pattern):

```typescript
// src/app/actions/portfolio.ts
"use server";

import { db } from "@/lib/db";
import { portfolios, holdings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updatePortfolio(id: string, data: PortfolioUpdate) {
  await db
    .update(portfolios)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(portfolios.id, id));

  revalidatePath("/dashboard/portfolios");
}

export async function deletePortfolio(id: string) {
  // Holdings should cascade delete via FK constraint
  await db.delete(portfolios).where(eq(portfolios.id, id));
  revalidatePath("/dashboard/portfolios");
}
```

**Database Consideration:**
Ensure foreign key with `ON DELETE CASCADE`:

```typescript
// In schema.ts
holdings: pgTable("holdings", {
  id: uuid("id").primaryKey(),
  portfolioId: uuid("portfolio_id")
    .references(() => portfolios.id, { onDelete: "cascade" })
    .notNull(),
  // ... other fields
});
```

**Effort:** Low-Medium
**Sources:** [Drizzle ORM Best Practices](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)

---

### Feature 4: Internationalization (i18n)

**Current State:** No i18n library installed

**Recommended:** `next-intl` (designed for Next.js App Router)

**Alternative:** `react-i18next` (more features, larger community)

**Comparison:**

| Factor                  | next-intl         | react-i18next    |
| ----------------------- | ----------------- | ---------------- |
| **Bundle Size**         | ~10 kB            | ~22 kB           |
| **Next.js Integration** | Native App Router | Via next-i18next |
| **ICU Format**          | Yes               | Plugin needed    |
| **TypeScript**          | Strong            | Strong           |
| **Downloads/week**      | ~800K             | ~2.1M            |

**Recommendation:** `next-intl` for App Router + smaller bundle

**Installation:**

```bash
pnpm add next-intl
```

**Number Formatting for Regional Decimals:**

```typescript
// Using Intl.NumberFormat (built-in, no library needed)
const formatNumber = (value: number, locale: string) => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Examples:
formatNumber(1234.56, "en-US"); // "1,234.56"
formatNumber(1234.56, "de-DE"); // "1.234,56"
formatNumber(1234.56, "pt-BR"); // "1.234,56"
```

**Effort:** Medium (requires new library + translation files)
**Sources:** [next-intl docs](https://next-intl-docs.vercel.app/), [i18nexus comparison](https://i18nexus.com/posts/comparing-next-i18next-and-react-intl)

---

### Feature 5: Wizard-Style Onboarding

**Current State:** Radix UI + Tailwind installed

**Implementation Pattern:**

```tsx
// Multi-step wizard using React state + Radix Progress
import { Progress } from "@/components/ui/progress";

const STEPS = ["Account", "Goals", "Risk Profile", "First Portfolio"];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Progress value={progress} className="mb-6" />

      <div className="flex justify-between mb-4 text-sm text-muted-foreground">
        {STEPS.map((s, i) => (
          <span key={s} className={cn(i <= step && "text-primary font-medium")}>
            {s}
          </span>
        ))}
      </div>

      {step === 0 && <AccountStep onNext={() => setStep(1)} />}
      {step === 1 && <GoalsStep onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <RiskProfileStep onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <FirstPortfolioStep onComplete={handleComplete} onBack={() => setStep(2)} />}
    </div>
  );
}
```

**Effort:** Medium
**Sources:** [Radix UI Progress](https://www.radix-ui.com/primitives/docs/components/progress)

---

### Feature 6: Market Data API Integration

**Current State:** Inngest installed for background jobs

**Recommended Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    Market Data Flow                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ Alpha Vantage│    │   Inngest    │    │ Vercel KV │  │
│  │     API      │───▶│  Scheduled   │───▶│   Cache   │  │
│  │              │    │    Job       │    │           │  │
│  └──────────────┘    └──────────────┘    └─────┬─────┘  │
│                                                 │        │
│                                                 ▼        │
│                                          ┌───────────┐  │
│                                          │   User    │  │
│                                          │  Refresh  │  │
│                                          │  (reads)  │  │
│                                          └───────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Inngest Job:**

```typescript
// src/inngest/functions/refresh-quotes.ts
import { inngest } from "@/inngest/client";
import { kv } from "@vercel/kv";

export const refreshQuotes = inngest.createFunction(
  { id: "refresh-market-quotes" },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    const symbols = await step.run("get-tracked-symbols", async () => {
      // Get unique symbols from all user portfolios
      return db.selectDistinct({ symbol: holdings.symbol }).from(holdings);
    });

    await step.run("fetch-and-cache-quotes", async () => {
      const quotes = await fetchFromAlphaVantage(symbols);
      await kv.set("market-quotes", quotes, { ex: 900 }); // 15 min TTL
    });
  }
);
```

**Effort:** Medium
**Sources:** [Alpha Vantage](https://www.alphavantage.co/), [Finnhub](https://finnhub.io/), [Inngest docs](https://www.inngest.com/docs)

---

## 3. React Server Components Patterns

### Best Practices for This Project

| Pattern                         | Use Case                      | Example                            |
| ------------------------------- | ----------------------------- | ---------------------------------- |
| **Server Components (default)** | Data fetching, static content | Portfolio list, dashboard          |
| **Client Components**           | Interactivity, forms, charts  | Edit forms, pie chart              |
| **Parallel Fetching**           | Multiple independent queries  | Fetch portfolios + quotes together |
| **Streaming**                   | Slow data sources             | Market data while UI loads         |

**Pattern Example:**

```tsx
// Server Component - fetches data
// src/app/dashboard/portfolios/page.tsx
export default async function PortfoliosPage() {
  const portfolios = await getPortfolios(); // Server-side

  return (
    <div>
      <PortfolioList portfolios={portfolios} />
      <Suspense fallback={<Skeleton />}>
        <MarketDataPanel /> {/* Streams in */}
      </Suspense>
    </div>
  );
}

// Client Component - handles interaction
// src/components/portfolio/portfolio-list.tsx
("use client");

export function PortfolioList({ portfolios }: Props) {
  // Client-side interactivity (edit, delete, drag-drop)
}
```

**Sources:** [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns), [Josh Comeau - RSC Guide](https://www.joshwcomeau.com/react/server-components/)

---

## 4. Form Validation Best Practices

### Current Setup: react-hook-form + Zod

**Real-Time Validation with Visual Feedback:**

```tsx
// Validation states with Tailwind
const inputStyles = {
  default: "border-input",
  error: "border-red-500 focus:ring-red-500",
  success: "border-green-500 focus:ring-green-500",
};

// Component
<Input
  {...register("percentage")}
  className={cn(
    "w-full",
    errors.percentage
      ? inputStyles.error
      : touchedFields.percentage && !errors.percentage
        ? inputStyles.success
        : inputStyles.default
  )}
/>;
{
  errors.percentage && <p className="text-sm text-red-500 mt-1">{errors.percentage.message}</p>;
}
```

**Decimal Separator Handling (i18n):**

```typescript
// Parse locale-aware number input
const parseLocalizedNumber = (value: string, locale: string): number => {
  const decimalSeparator = new Intl.NumberFormat(locale).format(1.1).charAt(1);
  const normalized = value
    .replace(new RegExp(`[^0-9${decimalSeparator}]`, "g"), "")
    .replace(decimalSeparator, ".");
  return parseFloat(normalized);
};

// Usage
parseLocalizedNumber("1.234,56", "de-DE"); // 1234.56
parseLocalizedNumber("1,234.56", "en-US"); // 1234.56
```

**Sources:** [react-hook-form docs](https://react-hook-form.com/), [FreeCodeCamp - Form Validation](https://www.freecodecamp.org/news/how-to-validate-forms-in-react/)

---

## 5. Database Best Practices (Drizzle)

### Identity Columns (2025 Standard)

```typescript
// Modern approach - generatedAlwaysAsIdentity
id: integer("id").primaryKey().generatedAlwaysAsIdentity();

// Legacy approach (avoid)
id: serial("id").primaryKey();
```

### Typed Selects

```typescript
// Type-safe queries
const portfolios = await db.query.portfolios.findMany({
  with: {
    holdings: true,
  },
  where: eq(portfolios.userId, userId),
});
```

### Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema directly (dev only)
pnpm db:push
```

**Sources:** [Drizzle ORM Docs](https://orm.drizzle.team/docs/get-started/postgresql-new), [Drizzle Best Practices Gist](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

---

## 6. Authentication Best Practices (Supabase Pattern)

### Current State: Custom auth with bcrypt + jose

**Key Security Practices:**

| Practice               | Implementation                         |
| ---------------------- | -------------------------------------- |
| **Strong Passwords**   | Zod schema: `z.string().min(8)`        |
| **Rate Limiting**      | Vercel KV counter per IP               |
| **Session Management** | JWT with short expiry + refresh token  |
| **Email Verification** | Resend integration (already installed) |
| **RLS Enabled**        | Enforce via `pnpm security:check-rls`  |

**Session Best Practice:**

```typescript
// Short-lived access token + longer refresh token
const accessToken = await signJWT(payload, { expiresIn: "15m" });
const refreshToken = await signJWT({ userId }, { expiresIn: "7d" });
```

**Sources:** [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth), [Supadex Security Guide](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide)

---

## 7. Testing Recommendations

### Current Setup: Vitest + Playwright

**Unit Test Example (Form Validation):**

```typescript
// tests/unit/portfolio-schema.test.ts
import { describe, it, expect } from "vitest";
import { portfolioSchema } from "@/lib/schemas/portfolio";

describe("portfolioSchema", () => {
  it("rejects allocations not summing to 100", () => {
    const result = portfolioSchema.safeParse({
      name: "Test Portfolio",
      holdings: [
        { symbol: "VTI", percentage: 50 },
        { symbol: "VXUS", percentage: 40 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("100%");
  });

  it("accepts valid 100% allocation", () => {
    const result = portfolioSchema.safeParse({
      name: "Test Portfolio",
      holdings: [
        { symbol: "VTI", percentage: 60 },
        { symbol: "VXUS", percentage: 40 },
      ],
    });

    expect(result.success).toBe(true);
  });
});
```

**E2E Test Example (Portfolio CRUD):**

```typescript
// tests/e2e/portfolio-crud.spec.ts
import { test, expect } from "@playwright/test";

test("user can edit portfolio name", async ({ page }) => {
  await page.goto("/dashboard/portfolios/1");
  await page.click('[data-testid="edit-portfolio"]');
  await page.fill('[data-testid="portfolio-name"]', "Updated Name");
  await page.click('[data-testid="save-portfolio"]');

  await expect(page.locator("h1")).toContainText("Updated Name");
});

test("user can delete portfolio", async ({ page }) => {
  await page.goto("/dashboard/portfolios");
  await page.click('[data-testid="delete-portfolio-1"]');
  await page.click('[data-testid="confirm-delete"]');

  await expect(page.locator('[data-testid="portfolio-1"]')).not.toBeVisible();
});
```

---

## 8. Feature Implementation Priority Matrix

Based on technical complexity and business value:

| Feature                     | Complexity | Dependencies            | Priority |
| --------------------------- | ---------- | ----------------------- | -------- |
| **Pie Chart**               | Low        | Recharts (installed)    | 🔴 P1    |
| **Allocation Sum (%)**      | Low        | RHF + Zod (installed)   | 🔴 P1    |
| **Edit/Delete Portfolio**   | Low-Med    | Drizzle (installed)     | 🔴 P1    |
| **i18n - Number Format**    | Low        | Intl (built-in)         | 🟡 P2    |
| **i18n - Full Translation** | Med        | next-intl (new)         | 🟡 P2    |
| **Wizard Onboarding**       | Med        | Radix (installed)       | 🟡 P2    |
| **Market Data API**         | Med        | Alpha Vantage + Inngest | 🟢 P3    |
| **Brokerage Import**        | High       | External APIs           | 🟢 P3    |

---

## 9. Technical Debt Considerations

### Items to Address

1. **No i18n library** - Add `next-intl` before building translation infrastructure
2. **Number formatting** - Create utility using `Intl.NumberFormat`
3. **API rate limiting** - Implement for public endpoints
4. **Error boundaries** - Add React error boundaries for graceful failures

### Items Already Solid

- ✅ Type-safe database layer (Drizzle)
- ✅ Form validation (RHF + Zod)
- ✅ Testing infrastructure (Vitest + Playwright)
- ✅ Observability (OpenTelemetry)
- ✅ Security checks (`pnpm security:check-rls`)

---

## References and Sources

### Framework Documentation

- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Drizzle ORM PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new)

### Libraries

- [Recharts Documentation](https://recharts.org/)
- [react-hook-form](https://react-hook-form.com/)
- [next-intl](https://next-intl-docs.vercel.app/)
- [react-i18next comparison](https://i18nexus.com/posts/comparing-react-i18next-and-react-intl)

### Best Practices

- [Drizzle ORM Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth)
- [React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Josh Comeau - RSC Guide](https://www.joshwcomeau.com/react/server-components/)

### Market Data APIs

- [Alpha Vantage](https://www.alphavantage.co/)
- [Finnhub](https://finnhub.io/)
- [Twelve Data](https://twelvedata.com/)
- [Polygon.io](https://polygon.io/)

---

_This technical research report was generated using the BMad Method Research Workflow._
