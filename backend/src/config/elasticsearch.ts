import { Client } from "@elastic/elasticsearch";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";

const clientOptions: any = {
  node: config.elasticsearch.url,
  tls: {
    rejectUnauthorized: false
  }
};

if (config.elasticsearch.username && config.elasticsearch.password) {
  clientOptions.auth = {
    username: config.elasticsearch.username,
    password: config.elasticsearch.password
  };
}

export const esClient = new Client(clientOptions);

// Check connection with diagnostic details
export async function checkElasticsearchHealth(): Promise<{ connected: boolean; error?: string }> {
  try {
    const health = await esClient.cluster.health({}, { requestTimeout: 3000 });
    return { connected: Boolean(health && health.status) };
  } catch (error: any) {
    logger.warn("Elasticsearch ping failed:", { error: error.message });
    return { connected: false, error: error.message };
  }
}
