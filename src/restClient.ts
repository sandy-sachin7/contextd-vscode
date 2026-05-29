import * as http from "http";
import { ContextdConfig, apiUrl } from "./config";

export interface HealthResponse {
  status: string;
  uptime_secs?: number;
}

export interface StatusResponse {
  status: string;
  uptime_secs?: number;
  indexed_files?: number;
  total_chunks?: number;
  database_size_bytes?: number;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  file_types?: string[];
  min_score?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  file_path: string;
  file_type: string;
  last_modified: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export class RestClient {
  private config: ContextdConfig;

  constructor(config: ContextdConfig) {
    this.config = config;
  }

  updateConfig(config: ContextdConfig): void {
    this.config = config;
  }

  health(timeoutMs = 3000): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health", undefined, timeoutMs);
  }

  status(timeoutMs = 5000): Promise<StatusResponse> {
    return this.request<StatusResponse>("GET", "/status", undefined, timeoutMs);
  }

  query(params: SearchQuery, timeoutMs = 10000): Promise<SearchResponse> {
    return this.request<SearchResponse>("POST", "/query", params, timeoutMs);
  }

  private request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 5000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const url = apiUrl(this.config, path);
      const parsed = new URL(url);

      const options: http.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method,
        timeout: timeoutMs,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`Invalid JSON response: ${data.slice(0, 100)}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}
