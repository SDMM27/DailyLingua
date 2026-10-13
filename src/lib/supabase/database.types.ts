
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_progress": {
                  Row: {
                    "activity_id": string,"completed_at": string | null,"created_at": string,"spent_seconds": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"completed_at"?: string | null,"created_at"?: string,"spent_seconds"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_id"?: string,"completed_at"?: string | null,"created_at"?: string,"spent_seconds"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_progress_activity_id_user_id_fkey"
      columns: ["activity_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_activities"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"contents": {
                  Row: {
                    "content_type": string,"created_at": string,"difficulty": string,"duration_minutes": number,"excerpt": string | null,"fetched_at": string,"id": string,"language": string,"published_at": string | null,"source_id": string,"summary": string,"title": string,"transcript_available": boolean,"updated_at": string,"url": string,"url_checked_at": string | null,"url_normalized": string | null,"url_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type": string,"created_at"?: string,"difficulty": string,"duration_minutes": number,"excerpt"?: string | null,"fetched_at"?: string,"id"?: string,"language": string,"published_at"?: string | null,"source_id": string,"summary": string,"title": string,"transcript_available"?: boolean,"updated_at"?: string,"url": string,"url_checked_at"?: string | null,"url_normalized"?: never,"url_status"?: string
                  }
                  Update: {
                    "content_type"?: string,"created_at"?: string,"difficulty"?: string,"duration_minutes"?: number,"excerpt"?: string | null,"fetched_at"?: string,"id"?: string,"language"?: string,"published_at"?: string | null,"source_id"?: string,"summary"?: string,"title"?: string,"transcript_available"?: boolean,"updated_at"?: string,"url"?: string,"url_checked_at"?: string | null,"url_normalized"?: never,"url_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contents_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "contents_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"languages": {
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
                },"mission_activities": {
                  Row: {
                    "estimated_minutes": number,"id": string,"kind": string,"position": number,"session_id": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "estimated_minutes": number,"id"?: string,"kind": string,"position": number,"session_id": string,"title": string,"user_id": string
                  }
                  Update: {
                    "estimated_minutes"?: number,"id"?: string,"kind"?: string,"position"?: number,"session_id"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mission_activities_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"mission_sessions": {
                  Row: {
                    "content_id": string,"created_at": string,"expressions": NonNullable<Json>,"id": string,"language": string,"mission_id": string,"position": number,"production": NonNullable<Json>,"question_count": number | null,"questions": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"created_at"?: string,"expressions"?: NonNullable<Json>,"id"?: string,"language": string,"mission_id": string,"position": number,"production": NonNullable<Json>,"question_count"?: never,"questions"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "content_id"?: string,"created_at"?: string,"expressions"?: NonNullable<Json>,"id"?: string,"language"?: string,"mission_id"?: string,"position"?: number,"production"?: NonNullable<Json>,"question_count"?: never,"questions"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mission_sessions_content_id_language_fkey"
      columns: ["content_id","language"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id","language"]
    },{
      foreignKeyName: "mission_sessions_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "mission_sessions_mission_id_user_id_fkey"
      columns: ["mission_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_stats"
      referencedColumns: ["mission_id","user_id"]
    },{
      foreignKeyName: "mission_sessions_mission_id_user_id_fkey"
      columns: ["mission_id","user_id"]
isOneToOne: false
      referencedRelation: "missions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"missions": {
                  Row: {
                    "budget_minutes": number,"completed_at": string | null,"created_at": string,"generated_at": string | null,"generation_meta": NonNullable<Json>,"id": string,"mission_date": string,"started_at": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_minutes": number,"completed_at"?: string | null,"created_at"?: string,"generated_at"?: string | null,"generation_meta"?: NonNullable<Json>,"id"?: string,"mission_date": string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "budget_minutes"?: number,"completed_at"?: string | null,"created_at"?: string,"generated_at"?: string | null,"generation_meta"?: NonNullable<Json>,"id"?: string,"mission_date"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "missions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "content_types": (string)[],"created_at": string,"daily_minutes": number,"difficulty": string,"generation_time": string,"id": string,"time_zone": string,"topics": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_types"?: (string)[],"created_at"?: string,"daily_minutes"?: number,"difficulty"?: string,"generation_time"?: string,"id": string,"time_zone"?: string,"topics"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "content_types"?: (string)[],"created_at"?: string,"daily_minutes"?: number,"difficulty"?: string,"generation_time"?: string,"id"?: string,"time_zone"?: string,"topics"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quiz_answers": {
                  Row: {
                    "answered_at": string,"id": string,"is_correct": boolean,"question_id": string,"selected_index": number,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string,"id"?: string,"is_correct"?: boolean,"question_id": string,"selected_index": number,"session_id": string,"user_id": string
                  }
                  Update: {
                    "answered_at"?: string,"id"?: string,"is_correct"?: boolean,"question_id"?: string,"selected_index"?: number,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_answers_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"homepage_url": string,"homepage_url_normalized": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"homepage_url": string,"homepage_url_normalized"?: never,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"homepage_url"?: string,"homepage_url_normalized"?: never,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_languages": {
                  Row: {
                    "created_at": string,"focus": string,"id": string,"language": string,"level": string,"target_level": string,"updated_at": string,"user_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"focus"?: string,"id"?: string,"language": string,"level": string,"target_level": string,"updated_at"?: string,"user_id": string,"weight"?: number
                  }
                  Update: {
                    "created_at"?: string,"focus"?: string,"id"?: string,"language"?: string,"level"?: string,"target_level"?: string,"updated_at"?: string,"user_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_languages_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "user_languages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_items": {
                  Row: {
                    "added_on": string,"box": number,"content_id": string | null,"created_at": string,"definition": string | null,"due_on": string,"example": string | null,"id": string,"language": string,"last_reviewed_on": string | null,"review_count": number,"source_name": string | null,"source_url": string | null,"status": string,"term": string,"translation": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_on"?: string,"box"?: number,"content_id"?: string | null,"created_at"?: string,"definition"?: string | null,"due_on"?: string,"example"?: string | null,"id"?: string,"language": string,"last_reviewed_on"?: string | null,"review_count"?: number,"source_name"?: string | null,"source_url"?: string | null,"status"?: string,"term": string,"translation": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "added_on"?: string,"box"?: number,"content_id"?: string | null,"created_at"?: string,"definition"?: string | null,"due_on"?: string,"example"?: string | null,"id"?: string,"language"?: string,"last_reviewed_on"?: string | null,"review_count"?: number,"source_name"?: string | null,"source_url"?: string | null,"status"?: string,"term"?: string,"translation"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_items_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_items_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "vocabulary_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_reviews": {
                  Row: {
                    "box_after": number,"box_before": number,"due_on_after": string,"grade": string,"id": string,"item_id": string,"reviewed_at": string,"reviewed_on": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "box_after": number,"box_before": number,"due_on_after": string,"grade": string,"id"?: string,"item_id": string,"reviewed_at"?: string,"reviewed_on": string,"user_id": string
                  }
                  Update: {
                    "box_after"?: number,"box_before"?: number,"due_on_after"?: string,"grade"?: string,"id"?: string,"item_id"?: string,"reviewed_at"?: string,"reviewed_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_reviews_item_id_user_id_fkey"
      columns: ["item_id","user_id"]
isOneToOne: false
      referencedRelation: "vocabulary_items"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            "mission_stats": {
                  Row: {
                    "budget_minutes": number | null,"completed_activities": number | null,"completed_at": string | null,"completed_minutes": number | null,"mission_date": string | null,"mission_id": string | null,"spent_seconds": number | null,"started_at": string | null,"status": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "missions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "normalize_url":
{ Args: { "url": string }; Returns: string
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
