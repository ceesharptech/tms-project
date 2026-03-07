// Auto-generated from Supabase schema — 2026-03-07
// Re-generate with: supabase gen types typescript --project-id lduelfkmkmkwzsjlblkf

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          contact: Json | null
          created_at: string
          face_embedding: Json | null
          full_name: string
          id: string
          license_no: string
          plate_no: string | null
          status: string
          strike_count: number
          updated_at: string
        }
        Insert: {
          contact?: Json | null
          created_at?: string
          face_embedding?: Json | null
          full_name: string
          id?: string
          license_no: string
          plate_no?: string | null
          status?: string
          strike_count?: number
          updated_at?: string
        }
        Update: {
          contact?: Json | null
          created_at?: string
          face_embedding?: Json | null
          full_name?: string
          id?: string
          license_no?: string
          plate_no?: string | null
          status?: string
          strike_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      offence_types: {
        Row: {
          base_fine: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          severity: string
          strike_weight: number
        }
        Insert: {
          base_fine: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          severity: string
          strike_weight: number
        }
        Update: {
          base_fine?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          severity?: string
          strike_weight?: number
        }
        Relationships: []
      }
      offences: {
        Row: {
          driver_id: string
          fine_amount: number
          id: string
          issued_at: string
          notes: string | null
          offence_type_id: string
          officer_id: string
          strike_delta: number
        }
        Insert: {
          driver_id: string
          fine_amount: number
          id?: string
          issued_at?: string
          notes?: string | null
          offence_type_id: string
          officer_id: string
          strike_delta: number
        }
        Update: {
          driver_id?: string
          fine_amount?: number
          id?: string
          issued_at?: string
          notes?: string | null
          offence_type_id?: string
          officer_id?: string
          strike_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "offences_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offences_offence_type_id_fkey"
            columns: ["offence_type_id"]
            isOneToOne: false
            referencedRelation: "offence_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offences_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_rules: {
        Row: {
          created_at: string
          fine_multiplier: number
          id: string
          max_strikes: number
          min_strikes: number
          status_flag: string | null
        }
        Insert: {
          created_at?: string
          fine_multiplier: number
          id?: string
          max_strikes: number
          min_strikes: number
          status_flag?: string | null
        }
        Update: {
          created_at?: string
          fine_multiplier?: number
          id?: string
          max_strikes?: number
          min_strikes?: number
          status_flag?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          officer_id: string
          password_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          officer_id: string
          password_hash: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          officer_id?: string
          password_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      auth_sub: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
