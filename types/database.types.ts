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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json
          record_id: string | null
          record_type: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          record_id?: string | null
          record_type: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          record_id?: string | null
          record_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          archived_at: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          email: string | null
          facebook: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source_option_id: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source_option_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source_option_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_source_option_id_fkey"
            columns: ["source_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: string | null
          id: string
          interaction_at: string
          interaction_type_option_id: string | null
          item_id: string | null
          next_follow_up_at: string | null
          notes: string | null
          summary: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string | null
          id?: string
          interaction_at?: string
          interaction_type_option_id?: string | null
          item_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          summary: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string | null
          id?: string
          interaction_at?: string
          interaction_type_option_id?: string | null
          item_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          summary?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_interaction_type_option_id_fkey"
            columns: ["interaction_type_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          sort_order: number
          storage_path: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          sort_order?: number
          storage_path: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          sort_order?: number
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          archived_at: string | null
          category_option_id: string | null
          cost_breakdown: Json
          cost_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          quantity: number
          reference_code: string | null
          selling_price: number | null
          status_option_id: string | null
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          category_option_id?: string | null
          cost_breakdown?: Json
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number
          reference_code?: string | null
          selling_price?: number | null
          status_option_id?: string | null
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          category_option_id?: string | null
          cost_breakdown?: Json
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          reference_code?: string | null
          selling_price?: number | null
          status_option_id?: string | null
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_option_id_fkey"
            columns: ["category_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_status_option_id_fkey"
            columns: ["status_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      record_tags: {
        Row: {
          created_at: string
          id: string
          record_id: string
          record_type: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_id: string
          record_type: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          archived_at: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          item_id: string | null
          notes: string | null
          quantity: number
          sale_price: number
          sold_at: string
          sold_by: string | null
          status_option_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          sale_price: number
          sold_at?: string
          sold_by?: string | null
          status_option_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          sale_price?: number
          sold_at?: string
          sold_by?: string | null
          status_option_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_status_option_id_fkey"
            columns: ["status_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_options: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          option_type: string
          sort_order: number
          updated_at: string
          value: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          option_type: string
          sort_order?: number
          updated_at?: string
          value: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          option_type?: string
          sort_order?: number
          updated_at?: string
          value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_options_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          archived_at: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          interaction_id: string | null
          item_id: string | null
          priority_option_id: string | null
          status_option_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          interaction_id?: string | null
          item_id?: string | null
          priority_option_id?: string | null
          status_option_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          interaction_id?: string | null
          item_id?: string | null
          priority_option_id?: string | null
          status_option_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_priority_option_id_fkey"
            columns: ["priority_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_option_id_fkey"
            columns: ["status_option_id"]
            isOneToOne: false
            referencedRelation: "settings_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          slug: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_interaction_with_follow_up: {
        Args: {
          p_actor_name: string
          p_customer_id?: string
          p_direction?: string
          p_follow_up_assigned_to?: string
          p_interaction_at: string
          p_item_id?: string
          p_next_follow_up_at?: string
          p_notes?: string
          p_summary: string
          p_type_option_id?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      sale_stock_units: {
        Args: {
          p_archived_at: string
          p_quantity: number
          p_status_option_id: string
        }
        Returns: number
      }
      seed_default_settings_options: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      shares_workspace_with: { Args: { p_user_id: string }; Returns: boolean }
      storage_path_in_my_workspace: {
        Args: { p_name: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
