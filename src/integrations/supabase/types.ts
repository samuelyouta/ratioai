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
      app_sessions: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          meals: Json | null
          platform: string | null
          profile: Json | null
          updated_at: string
          user_agent: string | null
          visit_count: number
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          meals?: Json | null
          platform?: string | null
          profile?: Json | null
          updated_at?: string
          user_agent?: string | null
          visit_count?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          meals?: Json | null
          platform?: string | null
          profile?: Json | null
          updated_at?: string
          user_agent?: string | null
          visit_count?: number
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          client_id: string | null
          created_at: string
          data: Json | null
          fat: number | null
          icon: string | null
          id: string
          image_url: string | null
          logged_at: string
          name: string | null
          protein: number | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          client_id?: string | null
          created_at?: string
          data?: Json | null
          fat?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          logged_at?: string
          name?: string | null
          protein?: number | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          client_id?: string | null
          created_at?: string
          data?: Json | null
          fat?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          logged_at?: string
          name?: string | null
          protein?: number | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity: string | null
          age: number | null
          blocker: string | null
          calorie_target: number | null
          carbs_target: number | null
          created_at: string
          data: Json | null
          dob_day: number | null
          dob_month: number | null
          dob_year: number | null
          fat_target: number | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          name: string | null
          protein_target: number | null
          source: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          activity?: string | null
          age?: number | null
          blocker?: string | null
          calorie_target?: number | null
          carbs_target?: number | null
          created_at?: string
          data?: Json | null
          dob_day?: number | null
          dob_month?: number | null
          dob_year?: number | null
          fat_target?: number | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          name?: string | null
          protein_target?: number | null
          source?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          activity?: string | null
          age?: number | null
          blocker?: string | null
          calorie_target?: number | null
          carbs_target?: number | null
          created_at?: string
          data?: Json | null
          dob_day?: number | null
          dob_month?: number | null
          dob_year?: number | null
          fat_target?: number | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          name?: string | null
          protein_target?: number | null
          source?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          email: string | null
          id: string
          platform: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          nurture_sent_at: string | null
          nurture_step: number
          unsubscribed: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nurture_sent_at?: string | null
          nurture_step?: number
          unsubscribed?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nurture_sent_at?: string | null
          nurture_step?: number
          unsubscribed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_waitlist_count: { Args: never; Returns: number }
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
