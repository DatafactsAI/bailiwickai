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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
