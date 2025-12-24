import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";

export type StartedInfra = {
  postgres: StartedTestContainer;
  redis: StartedTestContainer;
  databaseUrl: string;
  redisUrl: string;
};

export async function startInfra(): Promise<StartedInfra> {
  const postgres = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "app",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
    .start();

  const pgHost = postgres.getHost();
  const pgPort = postgres.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@${pgHost}:${pgPort}/app?schema=public`;

  const redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();

  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  return { postgres, redis, databaseUrl, redisUrl };
}

export async function stopInfra(infra: StartedInfra): Promise<void> {
  await infra.redis.stop();
  await infra.postgres.stop();
}
