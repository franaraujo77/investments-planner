# Plan: Fix OpenTelemetry Semantic Conventions Deprecation Warning

## Issue

The file `src/lib/telemetry/setup.ts` uses deprecated semantic convention constants:
- `SEMRESATTRS_SERVICE_NAME` (deprecated)
- `SEMRESATTRS_SERVICE_VERSION` (deprecated)
- `SEMRESATTRS_DEPLOYMENT_ENVIRONMENT` (deprecated)

The deprecation warning specifically mentions: `'SEMRESATTRS_DEPLOYMENT_ENVIRONMENT' is deprecated`.

## Root Cause

The `@opentelemetry/semantic-conventions` package underwent significant changes in version 1.x:
- The `SEMRESATTRS_*` prefix was deprecated in favor of `ATTR_*` naming
- The stable entry-point now only exports stable semantic conventions
- Some attributes (like `deployment.environment`) are now in the "incubating" entry-point

## Solution

### Option A: Use Stable ATTR_* Constants (Recommended)

Replace deprecated imports with the new stable constants:

**Before:**
```typescript
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
```

**After:**
```typescript
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

// deployment.environment is not in stable exports, use string literal
const ATTR_DEPLOYMENT_ENVIRONMENT = "deployment.environment";
```

### Option B: Use Incubating Entry-Point for All

Use the incubating entry-point which exports all constants including unstable ones:

```typescript
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions/incubating";
```

**Note:** The incubating entry-point is NOT subject to semantic versioning and MAY contain breaking changes in minor releases.

## Recommendation

**Use Option A** because:
1. `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION` are stable and available from the main entry-point
2. Using a string literal for `deployment.environment` is explicit and won't break with package updates
3. Avoids dependency on unstable/incubating APIs

## Implementation Steps

1. Update imports in `src/lib/telemetry/setup.ts`:
   - Replace `SEMRESATTRS_SERVICE_NAME` with `ATTR_SERVICE_NAME`
   - Replace `SEMRESATTRS_SERVICE_VERSION` with `ATTR_SERVICE_VERSION`
   - Replace `SEMRESATTRS_DEPLOYMENT_ENVIRONMENT` with a local constant

2. Update `createResource` function to use new constants (no changes needed to the function body, just the constant names)

3. Verify build passes without deprecation warnings

4. Run tests to ensure telemetry still works correctly

## Code Change

```typescript
// src/lib/telemetry/setup.ts

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { getTracerConfig, type TracerConfig } from "./config";

/**
 * Deployment environment attribute
 * Note: Not exported from stable semantic-conventions, using string literal
 * per OpenTelemetry semantic conventions specification
 */
const ATTR_DEPLOYMENT_ENVIRONMENT = "deployment.environment";

// ... rest of file unchanged ...
```

## Sources

- [OpenTelemetry JS Issue #5025](https://github.com/open-telemetry/opentelemetry-js/issues/5025)
- [OpenTelemetry JS Issue #5089](https://github.com/open-telemetry/opentelemetry-js/issues/5089)
- [@opentelemetry/semantic-conventions npm](https://www.npmjs.com/package/@opentelemetry/semantic-conventions)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
