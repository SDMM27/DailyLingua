import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest has no globals: React Testing Library's automatic cleanup needs this hook.
afterEach(() => cleanup());
