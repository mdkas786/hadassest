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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount_invested: number
          amount_received: number
          created_at: string
          expected_2x: number | null
          had_id: string
          id: string
          notes: string | null
          plan_name: Database["public"]["Enums"]["plan_type"]
          plan_rate: number
          start_date: string
          status: Database["public"]["Enums"]["investment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_invested?: number
          amount_received?: number
          created_at?: string
          expected_2x?: number | null
          had_id: string
          id?: string
          notes?: string | null
          plan_name?: Database["public"]["Enums"]["plan_type"]
          plan_rate?: number
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          amount_received?: number
          created_at?: string
          expected_2x?: number | null
          had_id?: string
          id?: string
          notes?: string | null
          plan_name?: Database["public"]["Enums"]["plan_type"]
          plan_rate?: number
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          identifier: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          identifier: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          identifier?: string
          success?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          had_id: string
          id: string
          notif_type: string
          read_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          had_id: string
          id?: string
          notif_type?: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          had_id?: string
          id?: string
          notif_type?: string
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          had_id: string
          id: string
          is_active: boolean
          mobile: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          upi_id: string | null
          wallet_address: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          had_id: string
          id: string
          is_active?: boolean
          mobile?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          upi_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          had_id?: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          upi_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      trading_assets: {
        Row: {
          admin_note: string | null
          allocation_percent: number
          asset_category: string
          asset_name: string
          coincap_id: string | null
          created_at: string
          current_price: number
          custom_current_price: number | null
          entry_price: number
          expected_duration_days: number
          id: string
          profit_target_percent: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["asset_status"]
          symbol: string
          updated_at: string
          use_manual_price: boolean
        }
        Insert: {
          admin_note?: string | null
          allocation_percent?: number
          asset_category?: string
          asset_name: string
          coincap_id?: string | null
          created_at?: string
          current_price?: number
          custom_current_price?: number | null
          entry_price?: number
          expected_duration_days?: number
          id?: string
          profit_target_percent?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["asset_status"]
          symbol: string
          updated_at?: string
          use_manual_price?: boolean
        }
        Update: {
          admin_note?: string | null
          allocation_percent?: number
          asset_category?: string
          asset_name?: string
          coincap_id?: string | null
          created_at?: string
          current_price?: number
          custom_current_price?: number | null
          entry_price?: number
          expected_duration_days?: number
          id?: string
          profit_target_percent?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["asset_status"]
          symbol?: string
          updated_at?: string
          use_manual_price?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          had_id: string
          id: string
          method: string | null
          notes: string | null
          rejection_reason: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          txn_ref: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          had_id: string
          id?: string
          method?: string | null
          notes?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          txn_ref?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          had_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          txn_ref?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      generate_had_id: { Args: never; Returns: string }
      get_trading_assets_admin: {
        Args: never
        Returns: {
          admin_note: string | null
          allocation_percent: number
          asset_category: string
          asset_name: string
          coincap_id: string | null
          created_at: string
          current_price: number
          custom_current_price: number | null
          entry_price: number
          expected_duration_days: number
          id: string
          profit_target_percent: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["asset_status"]
          symbol: string
          updated_at: string
          use_manual_price: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "trading_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_status: "active" | "paused" | "completed"
      investment_status: "active" | "completed" | "paused"
      plan_type: "starter" | "growth" | "fortune"
      risk_level: "low" | "medium" | "high"
      transaction_status: "pending" | "verified" | "rejected" | "completed"
      transaction_type: "investment" | "return"
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
      asset_status: ["active", "paused", "completed"],
      investment_status: ["active", "completed", "paused"],
      plan_type: ["starter", "growth", "fortune"],
      risk_level: ["low", "medium", "high"],
      transaction_status: ["pending", "verified", "rejected", "completed"],
      transaction_type: ["investment", "return"],
    },
  },
} as const
