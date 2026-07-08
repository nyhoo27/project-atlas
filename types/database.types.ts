/**
 * PLACEHOLDER — replace this file by running:
 *
 *   pnpm dlx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
 *
 * This file exists only so the project type-checks before a real Supabase
 * project is linked. Do NOT hand-edit the generated file once it exists —
 * regenerate it whenever the schema changes (see database/migrations).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
