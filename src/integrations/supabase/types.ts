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
      clients_financial_data: {
        Row: {
          advisor_advice: string | null
          advisor_name: string
          client1_centrelink_received: number | null
          client1_dob: string
          client1_gross_salary: number
          client1_health: string | null
          client1_income_tax: number | null
          client1_name: string
          client1_super_balance: number
          client1_work_status: string | null
          client2_centrelink_received: number | null
          client2_dob: string | null
          client2_gross_salary: number | null
          client2_health: string | null
          client2_income_tax: number | null
          client2_name: string | null
          client2_super_balance: number | null
          client2_work_status: string | null
          consultation_date: string
          created_at: string | null
          id: string
          total_investment_assets: number | null
          total_lifestyle_assets: number | null
          total_living_expenses: number | null
        }
        Insert: {
          advisor_advice?: string | null
          advisor_name: string
          client1_centrelink_received?: number | null
          client1_dob: string
          client1_gross_salary: number
          client1_health?: string | null
          client1_income_tax?: number | null
          client1_name: string
          client1_super_balance: number
          client1_work_status?: string | null
          client2_centrelink_received?: number | null
          client2_dob?: string | null
          client2_gross_salary?: number | null
          client2_health?: string | null
          client2_income_tax?: number | null
          client2_name?: string | null
          client2_super_balance?: number | null
          client2_work_status?: string | null
          consultation_date: string
          created_at?: string | null
          id?: string
          total_investment_assets?: number | null
          total_lifestyle_assets?: number | null
          total_living_expenses?: number | null
        }
        Update: {
          advisor_advice?: string | null
          advisor_name?: string
          client1_centrelink_received?: number | null
          client1_dob?: string
          client1_gross_salary?: number
          client1_health?: string | null
          client1_income_tax?: number | null
          client1_name?: string
          client1_super_balance?: number
          client1_work_status?: string | null
          client2_centrelink_received?: number | null
          client2_dob?: string | null
          client2_gross_salary?: number | null
          client2_health?: string | null
          client2_income_tax?: number | null
          client2_name?: string | null
          client2_super_balance?: number | null
          client2_work_status?: string | null
          consultation_date?: string
          created_at?: string | null
          id?: string
          total_investment_assets?: number | null
          total_lifestyle_assets?: number | null
          total_living_expenses?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          id: string
          metadata: Json | null
          timestamp: string
          type: string
        }
        Insert: {
          content: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type: string
        }
        Update: {
          content?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
