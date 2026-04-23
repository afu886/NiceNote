declare module '@op-engineering/op-sqlite' {
  export interface QueryResult {
    rows?: unknown[]
  }

  export interface OPSQLiteConnection {
    execute(sql: string, params?: unknown[]): QueryResult
    close(): void
  }

  export function open(options: { name: string; location?: string }): OPSQLiteConnection
}
