import { Pool, PoolClient, QueryResult } from "pg";
import { DatabaseConfig } from "../../src/types";
import {
	SCHEMA_SQL,
	CHECK_SCHEMA_SQL,
	CREATE_VERSION_TABLE_SQL,
	GET_VERSION_SQL,
	MARK_SCHEMA_INITIALIZED_SQL,
} from "./schema";

/**
 * Database connection manager
 * Handles PostgreSQL connection pooling and initialization
 */
class DatabaseManager {
	private pool: Pool | null = null;
	private isConnected: boolean = false;
	private config: DatabaseConfig | null = null;

	/**
	 * Connect to PostgreSQL database
	 */
	async connect(config: DatabaseConfig): Promise<boolean> {
		try {
			// Close existing connection if any
			if (this.pool) {
				await this.disconnect();
			}

			this.config = config;
			this.pool = new Pool({
				host: config.host,
				port: config.port,
				database: config.database,
				user: config.user,
				password: config.password,
				max: 20, // Maximum number of clients in the pool
				idleTimeoutMillis: 30000,
				connectionTimeoutMillis: 10000,
			});

			// Test connection
			const client = await this.pool.connect();
			await client.query("SELECT NOW()");
			client.release();

			this.isConnected = true;

			// Initialize schema if needed
			await this.initializeSchema();

			console.log("✅ Database connected successfully");
			return true;
		} catch (error) {
			console.error("❌ Database connection failed:", error);
			this.isConnected = false;
			this.pool = null;
			throw error;
		}
	}

	/**
	 * Disconnect from database
	 */
	async disconnect(): Promise<void> {
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
			this.isConnected = false;
			console.log("Database disconnected");
		}
	}

	/**
	 * Check if database is connected
	 */
	getConnectionStatus(): boolean {
		return this.isConnected;
	}

	/**
	 * Get database pool
	 */
	getPool(): Pool {
		if (!this.pool || !this.isConnected) {
			throw new Error("Database not connected. Call connect() first.");
		}
		return this.pool;
	}

	/**
	 * Execute a query
	 */
	async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
		const pool = this.getPool();
		try {
			const result = await pool.query<T>(sql, params);
			return result;
		} catch (error) {
			console.error("Query error:", error);
			console.error("SQL:", sql);
			console.error("Params:", params);
			throw error;
		}
	}

	/**
	 * Execute multiple queries in a transaction
	 */
	async transaction<T>(
		callback: (client: PoolClient) => Promise<T>,
	): Promise<T> {
		const pool = this.getPool();
		const client = await pool.connect();

		try {
			await client.query("BEGIN");
			const result = await callback(client);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Transaction error:", error);
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Initialize database schema
	 */
	private async initializeSchema(): Promise<void> {
		try {
			console.log("Checking database schema...");

			// Check if schema is initialized
			const checkResult = await this.query(CHECK_SCHEMA_SQL);
			const schemaExists = checkResult.rows[0]?.exists;

			if (!schemaExists) {
				console.log("Initializing database schema...");

				// Create all tables and indexes
				await this.query(SCHEMA_SQL);

				// Mark schema as initialized
				await this.query(MARK_SCHEMA_INITIALIZED_SQL);

				console.log("✅ Database schema initialized successfully");
			} else {
				console.log("✅ Database schema already initialized");
			}

			// Create version table and check schema version
			await this.query(CREATE_VERSION_TABLE_SQL);
			const versionResult = await this.query(GET_VERSION_SQL);
			const version = versionResult.rows[0]?.version || 0;
			console.log(`Database schema version: ${version}`);
		} catch (error) {
			console.error("❌ Schema initialization failed:", error);
			throw error;
		}
	}

	/**
	 * Test database connection
	 */
	async testConnection(): Promise<boolean> {
		try {
			if (!this.pool) {
				return false;
			}
			const result = await this.query("SELECT 1 as test");
			return result.rows[0]?.test === 1;
		} catch (error) {
			console.error("Connection test failed:", error);
			return false;
		}
	}

	/**
	 * Check if pgvector extension is available
	 */
	async checkPgVector(): Promise<boolean> {
		try {
			const result = await this.query(
				"SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists",
			);
			return result.rows[0]?.exists || false;
		} catch (error) {
			console.error("pgvector check failed:", error);
			return false;
		}
	}
}

// Singleton instance
export const dbManager = new DatabaseManager();
