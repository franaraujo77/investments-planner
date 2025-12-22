# Deployment Checklist

This checklist ensures all required configuration is in place before deploying to production.

## Pre-Deployment Verification

### 1. Data Provider API Keys (CRITICAL)

Without these API keys, the application uses **mock providers** that return fake data. Users will see placeholder values instead of real market data.

| Environment Variable         | Required | Purpose                                                      | Get From                                                    |
| ---------------------------- | -------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `GEMINI_API_KEY`             | **Yes**  | Stock prices, fundamentals (P/E, dividend yield, market cap) | [Google AI Studio](https://aistudio.google.com/app/apikey)  |
| `EXCHANGE_RATE_API_KEY`      | **Yes**  | Currency exchange rates for portfolio valuation              | [ExchangeRate-API](https://www.exchangerate-api.com/)       |
| `YAHOO_FINANCE_API_KEY`      | No       | Fallback price provider                                      | [RapidAPI](https://rapidapi.com/apidojo/api/yahoo-finance1) |
| `OPEN_EXCHANGE_RATES_APP_ID` | No       | Fallback exchange rates                                      | [OpenExchangeRates](https://openexchangerates.org/signup)   |

**Verification Command:**

```bash
curl https://your-app.vercel.app/api/health/providers
```

**Expected Response (properly configured):**

```json
{
  "data": {
    "providers": {
      "gemini-api": { "configured": true, "circuitState": "closed" },
      "exchangerate-api": { "configured": true, "circuitState": "closed" },
      "yahoo-finance": { "configured": false, "circuitState": "closed" },
      "open-exchange-rates": { "configured": false, "circuitState": "closed" }
    }
  }
}
```

**Warning Signs:**

- If `gemini-api.configured` is `false`, prices and fundamentals will be mock data
- If `exchangerate-api.configured` is `false`, currency conversion will use mock rates
- Check application logs for: `PRODUCTION USING MOCK PROVIDERS`

### 2. Database Configuration

| Environment Variable | Required | Purpose                                 |
| -------------------- | -------- | --------------------------------------- |
| `DATABASE_URL`       | **Yes**  | PostgreSQL connection string (Supabase) |

### 3. Authentication

| Environment Variable       | Required | Purpose                         |
| -------------------------- | -------- | ------------------------------- |
| `JWT_SECRET`               | **Yes**  | JWT signing key (min 32 chars)  |
| `JWT_ACCESS_TOKEN_EXPIRY`  | No       | Access token TTL (default: 15m) |
| `JWT_REFRESH_TOKEN_EXPIRY` | No       | Refresh token TTL (default: 7d) |

### 4. Caching (Vercel KV)

| Environment Variable | Required | Purpose                        |
| -------------------- | -------- | ------------------------------ |
| `KV_REST_API_URL`    | **Yes**  | Vercel KV REST API endpoint    |
| `KV_REST_API_TOKEN`  | **Yes**  | Vercel KV authentication token |

### 5. Email (Optional)

| Environment Variable | Required | Purpose                                      |
| -------------------- | -------- | -------------------------------------------- |
| `RESEND_API_KEY`     | No       | Email sending (verification, password reset) |
| `EMAIL_FROM_ADDRESS` | No       | From address for emails                      |

### 6. Background Jobs (Inngest)

| Environment Variable  | Required | Purpose                  |
| --------------------- | -------- | ------------------------ |
| `INNGEST_EVENT_KEY`   | **Yes**  | Event publishing key     |
| `INNGEST_SIGNING_KEY` | **Yes**  | Webhook verification key |

## Post-Deployment Verification

### 1. Check Provider Health

```bash
curl https://your-app.vercel.app/api/health/providers | jq
```

All required providers should show `"configured": true`.

### 2. Check Application Logs

Look for these log entries:

**Good (all providers configured):**

```
INFO: All required data providers configured
  configuredProviders: "Gemini API, ExchangeRate-API"
```

**Bad (missing providers):**

```
ERROR: PRODUCTION USING MOCK PROVIDERS - Data refresh will return fake data
  mockProviders: "Gemini API, ExchangeRate-API"
  action: "Set required API keys in environment variables"
```

### 3. Test Data Refresh

1. Log in to the application
2. Navigate to a portfolio
3. Click "Refresh Data"
4. Verify that prices update with real values (not placeholder data)

### 4. Check Database Security

```bash
# Run security check locally
pnpm security:check-rls
```

All tables should have RLS enabled.

## Troubleshooting

### Mock Providers in Production

**Symptom:** Users see fake/placeholder data when refreshing

**Cause:** Missing `GEMINI_API_KEY` or `EXCHANGE_RATE_API_KEY`

**Fix:**

1. Get API keys from the URLs listed above
2. Add to Vercel environment variables
3. Redeploy the application
4. Verify with `/api/health/providers`

### Circuit Breaker Open

**Symptom:** Provider shows `"circuitState": "open"` in health check

**Cause:** Provider had 5+ consecutive failures

**Fix:**

1. Wait 5 minutes for automatic reset
2. Check if the API key is valid
3. Check provider's status page for outages

### Rate Limiting

**Symptom:** Data refresh fails with rate limit error

**Cause:** User exceeded 5 refreshes per hour

**Fix:** This is intentional. Wait for the rate limit to reset.
