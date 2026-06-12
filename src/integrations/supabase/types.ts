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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_managed_users: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          managed_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          managed_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          managed_user_id?: string
        }
        Relationships: []
      }
      arion_credentials: {
        Row: {
          arion_last_sync: string | null
          arion_login: string | null
          arion_password: string | null
          arion_station: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arion_last_sync?: string | null
          arion_login?: string | null
          arion_password?: string | null
          arion_station?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arion_last_sync?: string | null
          arion_login?: string | null
          arion_password?: string | null
          arion_station?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_aircraft_models: {
        Row: {
          active: boolean
          airline_code: string
          cleaning_minutes: number | null
          created_at: string
          id: string
          label: string
          model_code: string
          sort_order: number
          turnaround_minutes: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          airline_code: string
          cleaning_minutes?: number | null
          created_at?: string
          id?: string
          label: string
          model_code: string
          sort_order?: number
          turnaround_minutes?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          airline_code?: string
          cleaning_minutes?: number | null
          created_at?: string
          id?: string
          label?: string
          model_code?: string
          sort_order?: number
          turnaround_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_airlines: {
        Row: {
          active: boolean
          code: string
          color: string
          created_at: string
          name: string
          prefix: string | null
          short_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          color: string
          created_at?: string
          name: string
          prefix?: string | null
          short_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          color?: string
          created_at?: string
          name?: string
          prefix?: string | null
          short_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_compartments: {
        Row: {
          active: boolean
          aircraft_model_code: string | null
          airline_code: string
          bulk: boolean
          created_at: string
          expandable: boolean
          expandable_default: number | null
          hold_style: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          aircraft_model_code?: string | null
          airline_code: string
          bulk?: boolean
          created_at?: string
          expandable?: boolean
          expandable_default?: number | null
          hold_style?: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          aircraft_model_code?: string | null
          airline_code?: string
          bulk?: boolean
          created_at?: string
          expandable?: boolean
          expandable_default?: number | null
          hold_style?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_equipment_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_equipment_units: {
        Row: {
          active: boolean
          category_id: string
          code: string
          created_at: string
          fuel_type: string
          id: string
          is_separator: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          code: string
          created_at?: string
          fuel_type?: string
          id: string
          is_separator?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          code?: string
          created_at?: string
          fuel_type?: string
          id?: string
          is_separator?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_equipment_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_holds: {
        Row: {
          active: boolean
          compartment_id: string
          created_at: string
          id: string
          label: string
          pair_group: string | null
          pair_side: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          compartment_id: string
          created_at?: string
          id: string
          label: string
          pair_group?: string | null
          pair_side?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          compartment_id?: string
          created_at?: string
          id?: string
          label?: string
          pair_group?: string | null
          pair_side?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_holds_compartment_id_fkey"
            columns: ["compartment_id"]
            isOneToOne: false
            referencedRelation: "catalog_compartments"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_load_codes: {
        Row: {
          active: boolean
          airline_code: string
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          airline_code: string
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          airline_code?: string
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_time_field_overrides: {
        Row: {
          airline_code: string
          clock_color: string | null
          created_at: string
          field_key: string
          id: string
          label: string | null
          sort_order: number | null
          type: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          airline_code: string
          clock_color?: string | null
          created_at?: string
          field_key: string
          id?: string
          label?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          airline_code?: string
          clock_color?: string | null
          created_at?: string
          field_key?: string
          id?: string
          label?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      equipment_activity_log: {
        Row: {
          category_id: string | null
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          source: string
          unit_code: string | null
          unit_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          unit_code?: string | null
          unit_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          unit_code?: string | null
          unit_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      equipment_state: {
        Row: {
          battery_level: number | null
          charging_since: string | null
          is_broken: boolean
          is_charging: boolean
          parking: string
          unit_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          battery_level?: number | null
          charging_since?: string | null
          is_broken?: boolean
          is_charging?: boolean
          parking?: string
          unit_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          battery_level?: number | null
          charging_since?: string | null
          is_broken?: boolean
          is_charging?: boolean
          parking?: string
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_state_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "catalog_equipment_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_airlines: {
        Row: {
          cargo_arrival: string | null
          cargo_departure: string | null
          created_at: string
          id: string
          mail_arrival: string | null
          mail_departure: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          cargo_arrival?: string | null
          cargo_departure?: string | null
          created_at?: string
          id?: string
          mail_arrival?: string | null
          mail_departure?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          cargo_arrival?: string | null
          cargo_departure?: string | null
          created_at?: string
          id?: string
          mail_arrival?: string | null
          mail_departure?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          blocked: boolean
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_flights: {
        Row: {
          adt: string | null
          aircraft_type: string | null
          airline_code: string | null
          cancelled: boolean | null
          departure_fn: string | null
          edt: string | null
          flight_closed: boolean | null
          flight_date: string
          flight_number: string
          home_station: string | null
          id: string
          movement_type: string | null
          parking_code: string | null
          registration: string | null
          sdt: string | null
          source_station: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          adt?: string | null
          aircraft_type?: string | null
          airline_code?: string | null
          cancelled?: boolean | null
          departure_fn?: string | null
          edt?: string | null
          flight_closed?: boolean | null
          flight_date: string
          flight_number: string
          home_station?: string | null
          id?: string
          movement_type?: string | null
          parking_code?: string | null
          registration?: string | null
          sdt?: string | null
          source_station?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          adt?: string | null
          aircraft_type?: string | null
          airline_code?: string | null
          cancelled?: boolean | null
          departure_fn?: string | null
          edt?: string | null
          flight_closed?: boolean | null
          flight_date?: string
          flight_number?: string
          home_station?: string | null
          id?: string
          movement_type?: string | null
          parking_code?: string | null
          registration?: string | null
          sdt?: string | null
          source_station?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      turnarounds: {
        Row: {
          airline: string
          created_at: string
          date: string
          field_values: Json
          flight_number: string
          id: string
          observations: string | null
          times: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          airline: string
          created_at?: string
          date: string
          field_values?: Json
          flight_number: string
          id?: string
          observations?: string | null
          times?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string
          created_at?: string
          date?: string
          field_values?: Json
          flight_number?: string
          id?: string
          observations?: string | null
          times?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_module_access: {
        Row: {
          created_at: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_user: {
        Args: { _admin_id: string; _target_id: string }
        Returns: boolean
      }
      has_module_access: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
