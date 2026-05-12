import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";

expect.extend(matchers);

process.env.NEXT_PUBLIC_DEMO_EMAIL ??= "demo@test.local";
process.env.NEXT_PUBLIC_DEMO_PASSWORD ??= "test-password-1234567890";
