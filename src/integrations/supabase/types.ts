export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          incurred_at: string
          location_id: string | null
          name: string | null
          notes: string | null
          tank_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          incurred_at?: string
          location_id?: string | null
          name?: string | null
          notes?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          incurred_at?: string
          location_id?: string | null
          name?: string | null
          notes?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_logs: {
        Row: {
          account_id: string
          created_at: string
          fed_at: string
          id: string
          location_id: string | null
          notes: string | null
          quantity: number
          schedule: string | null
          stock_id: string | null
          tank_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          fed_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          quantity: number
          schedule?: string | null
          stock_id?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          fed_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          quantity?: number
          schedule?: string | null
          stock_id?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          account_id: string
          address: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          address?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      material_logs: {
        Row: {
          account_id: string
          created_at: string
          id: string
          location_id: string | null
          logged_at: string
          note: string | null
          quantity: number
          stock_id: string | null
          tank_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          quantity: number
          stock_id?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          quantity?: number
          stock_id?: string | null
          tank_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_logs_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_logs_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_changes: {
        Row: {
          account_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          payload: Json | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          payload?: Json | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          payload?: Json | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_changes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          account_id: string
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          location_id: string | null
          min_stock: number | null
          name: string
          notes: string | null
          price_per_unit: number | null
          quantity: number
          total_amount: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          min_stock?: number | null
          name: string
          notes?: string | null
          price_per_unit?: number | null
          quantity?: number
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          min_stock?: number | null
          name?: string
          notes?: string | null
          price_per_unit?: number | null
          quantity?: number
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tank_crops: {
        Row: {
          account_id: string
          area: number | null
          created_at: string
          end_date: string | null
          id: string
          pl_size: number | null
          seed_date: string
          seed_weight: number | null
          tank_id: string
          total_seed: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          area?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          pl_size?: number | null
          seed_date: string
          seed_weight?: number | null
          tank_id: string
          total_seed?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          area?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          pl_size?: number | null
          seed_date?: string
          seed_weight?: number | null
          tank_id?: string
          total_seed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tank_crops_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tank_crops_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      tanks: {
        Row: {
          account_id: string
          area: number | null
          created_at: string
          deleted_at: string | null
          id: string
          location_id: string
          name: string
          pl_size: number | null
          seed_weight: number | null
          status: string
          total_seed: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          area?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id: string
          name: string
          pl_size?: number | null
          seed_weight?: number | null
          status?: string
          total_seed?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          area?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string
          name?: string
          pl_size?: number | null
          seed_weight?: number | null
          status?: string
          total_seed?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tanks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tanks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      usernames: {
        Row: {
          account_id: string
          created_at: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          account_id: string
          created_at?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          account_id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_deleted_tanks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      current_user_is_account_member: {
        Args: { aid: string }
        Returns: boolean
      }
      current_user_is_account_owner: {
        Args: { aid: string }
        Returns: boolean
      }
    }
    Enums: {
      membership_role: "owner" | "manager" | "partner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      membership_role: ["owner", "manager", "partner"],
    },
  },
} as const
