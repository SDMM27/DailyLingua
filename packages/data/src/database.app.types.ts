
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "app": {
          Tables: {
            "ai_call": {
                  Row: {
                    "batch": boolean,"cache_read_tokens": number,"cache_write_tokens": number,"cost_usd": number,"created_at": string,"id": number,"input_tokens": number,"model": string,"output_tokens": number,"prompt_version": string | null,"purpose": string,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch"?: boolean,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd"?: number,"created_at"?: string,"id"?: never,"input_tokens"?: number,"model": string,"output_tokens"?: number,"prompt_version"?: string | null,"purpose": string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "batch"?: boolean,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd"?: number,"created_at"?: string,"id"?: never,"input_tokens"?: number,"model"?: string,"output_tokens"?: number,"prompt_version"?: string | null,"purpose"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"assessment_result": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"language": string,"levels": NonNullable<Json>,"payload": NonNullable<Json>,"taken_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"language": string,"levels"?: NonNullable<Json>,"payload": NonNullable<Json>,"taken_at": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"language"?: string,"levels"?: NonNullable<Json>,"payload"?: NonNullable<Json>,"taken_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_result_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"attempt": {
                  Row: {
                    "answer": NonNullable<Json>,"client_event_id": string,"correct": boolean | null,"duration_ms": number | null,"exercise_kind": string,"exercise_ref": string | null,"id": number,"language": string,"occurred_at": string,"received_at": string,"result": Json | null,"session_id": string | null,"step": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"client_event_id": string,"correct"?: boolean | null,"duration_ms"?: number | null,"exercise_kind": string,"exercise_ref"?: string | null,"id"?: never,"language": string,"occurred_at": string,"received_at"?: string,"result"?: Json | null,"session_id"?: string | null,"step": string,"user_id": string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"client_event_id"?: string,"correct"?: boolean | null,"duration_ms"?: number | null,"exercise_kind"?: string,"exercise_ref"?: string | null,"id"?: never,"language"?: string,"occurred_at"?: string,"received_at"?: string,"result"?: Json | null,"session_id"?: string | null,"step"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempt_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "attempt_session_fkey"
      columns: ["session_id","user_id","language"]
isOneToOne: false
      referencedRelation: "session"
      referencedColumns: ["id","user_id","language"]
    }
                  ]
                },"card": {
                  Row: {
                    "back": string | null,"back_language": string | null,"context": string | null,"created_at": string,"deleted_at": string | null,"difficulty": number | null,"due_at": string,"front": string,"id": string,"kind": string,"language": string,"lapses": number,"last_review_at": string | null,"legacy_box": number | null,"list_id": string | null,"note": string | null,"payload": NonNullable<Json>,"ref": string | null,"reps": number,"source": string,"stability": number | null,"state": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "back"?: string | null,"back_language"?: string | null,"context"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"difficulty"?: number | null,"due_at": string,"front": string,"id"?: string,"kind": string,"language": string,"lapses"?: number,"last_review_at"?: string | null,"legacy_box"?: number | null,"list_id"?: string | null,"note"?: string | null,"payload"?: NonNullable<Json>,"ref"?: string | null,"reps"?: number,"source"?: string,"stability"?: number | null,"state": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "back"?: string | null,"back_language"?: string | null,"context"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"difficulty"?: number | null,"due_at"?: string,"front"?: string,"id"?: string,"kind"?: string,"language"?: string,"lapses"?: number,"last_review_at"?: string | null,"legacy_box"?: number | null,"list_id"?: string | null,"note"?: string | null,"payload"?: NonNullable<Json>,"ref"?: string | null,"reps"?: number,"source"?: string,"stability"?: number | null,"state"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "card_list_fkey"
      columns: ["list_id","user_id","language"]
isOneToOne: false
      referencedRelation: "card_list"
      referencedColumns: ["id","user_id","language"]
    }
                  ]
                },"card_list": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"id": string,"language": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"language": string,"name": string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"language"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_list_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"correction": {
                  Row: {
                    "created_at": string,"explanation_language": string,"feedback": NonNullable<Json>,"id": string,"input_tokens": number | null,"model": string | null,"output_tokens": number | null,"production_id": string,"prompt_version": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"explanation_language": string,"feedback": NonNullable<Json>,"id"?: string,"input_tokens"?: number | null,"model"?: string | null,"output_tokens"?: number | null,"production_id": string,"prompt_version"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"explanation_language"?: string,"feedback"?: NonNullable<Json>,"id"?: string,"input_tokens"?: number | null,"model"?: string | null,"output_tokens"?: number | null,"production_id"?: string,"prompt_version"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "correction_production_fkey"
      columns: ["production_id","user_id"]
isOneToOne: false
      referencedRelation: "production"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"enrollment": {
                  Row: {
                    "active": boolean,"created_at": string,"daily_minutes": number,"days": (number)[],"focus": NonNullable<Json>,"id": string,"language": string,"position": number,"purpose": string | null,"target_level": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"daily_minutes": number,"days"?: (number)[],"focus"?: NonNullable<Json>,"id"?: string,"language": string,"position"?: number,"purpose"?: string | null,"target_level"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"daily_minutes"?: number,"days"?: (number)[],"focus"?: NonNullable<Json>,"id"?: string,"language"?: string,"position"?: number,"purpose"?: string | null,"target_level"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollment_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"language": {
                  Row: {
                    "code": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"legacy_map": {
                  Row: {
                    "app_id": string,"app_table": string,"legacy_id": string,"legacy_table": string,"migrated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_id": string,"app_table": string,"legacy_id": string,"legacy_table": string,"migrated_at"?: string,"user_id": string
                  }
                  Update: {
                    "app_id"?: string,"app_table"?: string,"legacy_id"?: string,"legacy_table"?: string,"migrated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"legacy_record": {
                  Row: {
                    "archived_at": string,"legacy_id": string,"legacy_table": string,"payload": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string,"legacy_id": string,"legacy_table": string,"payload": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "archived_at"?: string,"legacy_id"?: string,"legacy_table"?: string,"payload"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"production": {
                  Row: {
                    "created_at": string,"id": string,"language": string,"mode": string,"session_id": string | null,"task": NonNullable<Json>,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"language": string,"mode": string,"session_id"?: string | null,"task"?: NonNullable<Json>,"text": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"language"?: string,"mode"?: string,"session_id"?: string | null,"task"?: NonNullable<Json>,"text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "production_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "production_session_fkey"
      columns: ["session_id","user_id","language"]
isOneToOne: false
      referencedRelation: "session"
      referencedColumns: ["id","user_id","language"]
    }
                  ]
                },"profile": {
                  Row: {
                    "app_active_since": string | null,"created_at": string,"game_settings": NonNullable<Json>,"is_guest": boolean,"legacy_migrated_at": string | null,"native_language": string,"reminder_time": string | null,"time_zone": string,"ui_language": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_active_since"?: string | null,"created_at"?: string,"game_settings"?: NonNullable<Json>,"is_guest"?: boolean,"legacy_migrated_at"?: string | null,"native_language"?: string,"reminder_time"?: string | null,"time_zone"?: string,"ui_language"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "app_active_since"?: string | null,"created_at"?: string,"game_settings"?: NonNullable<Json>,"is_guest"?: boolean,"legacy_migrated_at"?: string | null,"native_language"?: string,"reminder_time"?: string | null,"time_zone"?: string,"ui_language"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quota_usage": {
                  Row: {
                    "day": string,"kind": string,"used": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"kind": string,"used"?: number,"user_id": string
                  }
                  Update: {
                    "day"?: string,"kind"?: string,"used"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"review_log": {
                  Row: {
                    "card_id": string,"client_event_id": string | null,"created_at": string,"elapsed_days": number | null,"id": number,"mode": string | null,"origin": string,"rating": number,"reviewed_at": string,"scheduled_days": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"client_event_id"?: string | null,"created_at"?: string,"elapsed_days"?: number | null,"id"?: never,"mode"?: string | null,"origin": string,"rating": number,"reviewed_at": string,"scheduled_days"?: number | null,"user_id": string
                  }
                  Update: {
                    "card_id"?: string,"client_event_id"?: string | null,"created_at"?: string,"elapsed_days"?: number | null,"id"?: never,"mode"?: string | null,"origin"?: string,"rating"?: number,"reviewed_at"?: string,"scheduled_days"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_log_card_fkey"
      columns: ["card_id","user_id"]
isOneToOne: false
      referencedRelation: "card"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"rewrite": {
                  Row: {
                    "accepted": boolean | null,"correction_id": string,"created_at": string,"id": string,"sentence_index": number,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted"?: boolean | null,"correction_id": string,"created_at"?: string,"id"?: string,"sentence_index": number,"text": string,"user_id": string
                  }
                  Update: {
                    "accepted"?: boolean | null,"correction_id"?: string,"created_at"?: string,"id"?: string,"sentence_index"?: number,"text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rewrite_correction_fkey"
      columns: ["correction_id","user_id"]
isOneToOne: false
      referencedRelation: "correction"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"session": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"day": string,"id": string,"language": string,"plan": NonNullable<Json>,"started_at": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"day": string,"id"?: string,"language": string,"plan"?: NonNullable<Json>,"started_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"day"?: string,"id"?: string,"language"?: string,"plan"?: NonNullable<Json>,"started_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"skill_estimate": {
                  Row: {
                    "language": string,"level_value": number,"skill": string,"source": string,"uncertainty": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "language": string,"level_value": number,"skill": string,"source": string,"uncertainty": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "language"?: string,"level_value"?: number,"skill"?: string,"source"?: string,"uncertainty"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skill_estimate_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"streak_state": {
                  Row: {
                    "best": number,"current": number,"freezes": number,"last_day": string | null,"mode": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best"?: number,"current"?: number,"freezes"?: number,"last_day"?: string | null,"mode"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "best"?: number,"current"?: number,"freezes"?: number,"last_day"?: string | null,"mode"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"study_day": {
                  Row: {
                    "day": string,"origin": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"origin": string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"origin"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"xp_ledger": {
                  Row: {
                    "amount": number,"attempt_id": number | null,"created_at": string,"day": string,"id": number,"language": string | null,"meta": NonNullable<Json>,"reason": string,"review_log_id": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"attempt_id"?: number | null,"created_at"?: string,"day": string,"id"?: never,"language"?: string | null,"meta"?: NonNullable<Json>,"reason": string,"review_log_id"?: number | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"attempt_id"?: number | null,"created_at"?: string,"day"?: string,"id"?: never,"language"?: string | null,"meta"?: NonNullable<Json>,"reason"?: string,"review_log_id"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "xp_ledger_attempt_fkey"
      columns: ["attempt_id","user_id"]
isOneToOne: false
      referencedRelation: "attempt"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "xp_ledger_review_log_fkey"
      columns: ["review_log_id","user_id"]
isOneToOne: false
      referencedRelation: "review_log"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_valid_weekdays":
{ Args: { "p_days": (number)[] }; Returns: boolean
                           },
"legacy_assessments":
{ Args: { "p_user_id": string }; Returns: {
              "kind": string,"language": string,"legacy_id": string,"legacy_table": string,"levels": Json,"payload": Json,"taken_at": string
            }[]
                           },
"legacy_cards":
{ Args: { "p_user_id": string }; Returns: {
              "back": string,"back_language": string,"context": string,"created_at": string,"due_at": string,"front": string,"kind": string,"language": string,"lapses": number,"last_review_at": string,"legacy_box": number,"legacy_id": string,"legacy_list_id": string,"legacy_table": string,"payload": Json,"ref": string,"reps": number,"stability": number,"state": string,"updated_at": string
            }[]
                           },
"legacy_level_value":
{ Args: { "p_level": string }; Returns: number
                           },
"legacy_productions":
{ Args: { "p_user_id": string }; Returns: {
              "body": string,"created_at": string,"language": string,"legacy_id": string,"mode": string,"task": Json
            }[]
                           },
"legacy_study_days":
{ Args: { "p_user_id": string }; Returns: string[]
                           },
"leitner_interval":
{ Args: { "p_box": number }; Returns: number
                           },
"mark_active":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"migrate_all":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"migrate_user":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"save_profile":
{ Args: { "p_native_language": string,"p_reminder_time"?: string,"p_time_zone": string,"p_ui_language": string }; Returns: {
              "app_active_since": string | null,
"created_at": string,
"game_settings": NonNullable<Json>,
"is_guest": boolean,
"legacy_migrated_at": string | null,
"native_language": string,
"reminder_time": string | null,
"time_zone": string,
"ui_language": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "profile"
        isOneToOne: true
        isSetofReturn: false
      } },
"verify_migration":
{ Args: Record<PropertyKey, never>; Returns: {
              "actual": string,"check_name": string,"expected": string,"user_id": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "app": {
          Enums: {
            
          }
        }
} as const
