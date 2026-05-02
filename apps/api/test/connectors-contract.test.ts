import { describe, expect, it } from "vitest";
import { buildAgentConnectorManifest } from "@factum/agent-connectors";

describe("agent connector HTTP contract", () => {
  it("connector_registry tools bind to POST /api/connectors/run", () => {
    const manifest = buildAgentConnectorManifest();
    const connectorTools = manifest.filter((entry) => entry.binding.type === "connector_registry");
    expect(connectorTools.length).toBeGreaterThan(0);
    for (const tool of connectorTools) {
      expect(tool.binding).toMatchObject({ type: "connector_registry" });
      if (tool.binding.type === "connector_registry") {
        expect(tool.binding.route).toBe("/api/connectors/run");
      }
    }
  });
});
