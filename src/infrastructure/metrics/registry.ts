import client from "prom-client";

export type Metrics = {
  registry: client.Registry;
};

export function createMetrics(): Metrics {
  const registry = new client.Registry();
  registry.setDefaultLabels({
    service: "rbitly",
  });

  client.collectDefaultMetrics({ register: registry });

  return { registry };
}
