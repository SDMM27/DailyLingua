
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
                },"content_refusals": {
                  Row: {
                    "content_id": string,"created_at": string,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"created_at"?: string,"reason"?: string,"user_id": string
                  }
                  Update: {
                    "content_id"?: string,"created_at"?: string,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_refusals_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_refusals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contents": {
                  Row: {
                    "audio_url": string | null,"author": string | null,"categories": (string)[],"content_type": string,"created_at": string,"difficulty": string,"duration_minutes": number,"excerpt": string | null,"fetched_at": string,"id": string,"language": string,"published_at": string | null,"source_id": string,"summary": string,"title": string,"transcript_available": boolean,"updated_at": string,"url": string,"url_checked_at": string | null,"url_normalized": string | null,"url_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_url"?: string | null,"author"?: string | null,"categories"?: (string)[],"content_type": string,"created_at"?: string,"difficulty": string,"duration_minutes": number,"excerpt"?: string | null,"fetched_at"?: string,"id"?: string,"language": string,"published_at"?: string | null,"source_id": string,"summary": string,"title": string,"transcript_available"?: boolean,"updated_at"?: string,"url": string,"url_checked_at"?: string | null,"url_normalized"?: never,"url_status"?: string
                  }
                  Update: {
                    "audio_url"?: string | null,"author"?: string | null,"categories"?: (string)[],"content_type"?: string,"created_at"?: string,"difficulty"?: string,"duration_minutes"?: number,"excerpt"?: string | null,"fetched_at"?: string,"id"?: string,"language"?: string,"published_at"?: string | null,"source_id"?: string,"summary"?: string,"title"?: string,"transcript_available"?: boolean,"updated_at"?: string,"url"?: string,"url_checked_at"?: string | null,"url_normalized"?: never,"url_status"?: string
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
                },"correction_cards": {
                  Row: {
                    "added_on": string,"box": number,"category": string | null,"corrected": string,"correction_index": number,"created_at": string,"due_on": string,"explanation": string,"id": string,"language": string,"last_reviewed_on": string | null,"original": string,"review_count": number,"session_id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_on": string,"box"?: number,"category"?: string | null,"corrected": string,"correction_index": number,"created_at"?: string,"due_on": string,"explanation": string,"id"?: string,"language": string,"last_reviewed_on"?: string | null,"original": string,"review_count"?: number,"session_id": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "added_on"?: string,"box"?: number,"category"?: string | null,"corrected"?: string,"correction_index"?: number,"created_at"?: string,"due_on"?: string,"explanation"?: string,"id"?: string,"language"?: string,"last_reviewed_on"?: string | null,"original"?: string,"review_count"?: number,"session_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "correction_cards_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "correction_cards_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"cron_runs": {
                  Row: {
                    "error": string | null,"finished_at": string | null,"id": string,"job": string,"started_at": string,"stats": NonNullable<Json>,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"finished_at"?: string | null,"id"?: string,"job": string,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: string
                  }
                  Update: {
                    "error"?: string | null,"finished_at"?: string | null,"id"?: string,"job"?: string,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"feedback": {
                  Row: {
                    "app_version": string | null,"category": string,"created_at": string,"id": string,"message": string,"page": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string | null,"category": string,"created_at"?: string,"id"?: string,"message": string,"page"?: string | null,"user_id": string
                  }
                  Update: {
                    "app_version"?: string | null,"category"?: string,"created_at"?: string,"id"?: string,"message"?: string,"page"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"grammar_cards": {
                  Row: {
                    "added_on": string,"box": number,"created_at": string,"due_on": string,"id": string,"language": string,"last_reviewed_on": string | null,"point_id": string,"review_count": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_on": string,"box"?: number,"created_at"?: string,"due_on": string,"id"?: string,"language": string,"last_reviewed_on"?: string | null,"point_id": string,"review_count"?: number,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "added_on"?: string,"box"?: number,"created_at"?: string,"due_on"?: string,"id"?: string,"language"?: string,"last_reviewed_on"?: string | null,"point_id"?: string,"review_count"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grammar_cards_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "grammar_cards_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"guest_mission_reservations": {
                  Row: {
                    "created_at": string,"mission_date": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"mission_date": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"mission_date"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
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
                    "content_id": string,"created_at": string,"expressions": NonNullable<Json>,"id": string,"language": string,"mission_id": string,"position": number,"replacing_since": string | null,"production": NonNullable<Json>,"question_count": number | null,"questions": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"created_at"?: string,"expressions"?: NonNullable<Json>,"id"?: string,"language": string,"mission_id": string,"position": number,"replacing_since"?: string | null,"production": NonNullable<Json>,"question_count"?: never,"questions"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "content_id"?: string,"created_at"?: string,"expressions"?: NonNullable<Json>,"id"?: string,"language"?: string,"mission_id"?: string,"position"?: number,"replacing_since"?: string | null,"production"?: NonNullable<Json>,"question_count"?: never,"questions"?: NonNullable<Json>,"user_id"?: string
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
                    "budget_minutes": number,"completed_at": string | null,"created_at": string,"generated_at": string | null,"generation_attempts": number,"generation_error": string | null,"generation_meta": NonNullable<Json>,"id": string,"mission_date": string,"session_replacements": number,"started_at": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_minutes": number,"completed_at"?: string | null,"created_at"?: string,"generated_at"?: string | null,"generation_attempts"?: number,"generation_error"?: string | null,"generation_meta"?: NonNullable<Json>,"id"?: string,"mission_date": string,"session_replacements"?: number,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "budget_minutes"?: number,"completed_at"?: string | null,"created_at"?: string,"generated_at"?: string | null,"generation_attempts"?: number,"generation_error"?: string | null,"generation_meta"?: NonNullable<Json>,"id"?: string,"mission_date"?: string,"session_replacements"?: number,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
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
                },"placement_tests": {
                  Row: {
                    "answers": Json | null,"bank_version": string | null,"chosen_level": string | null,"confidence": string | null,"estimated_level": string | null,"id": string,"language": string,"start_level": string | null,"status": string,"taken_at": string,"user_id": string,"variant": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: Json | null,"bank_version"?: string | null,"chosen_level"?: string | null,"confidence"?: string | null,"estimated_level"?: string | null,"id"?: string,"language": string,"start_level"?: string | null,"status": string,"taken_at"?: string,"user_id": string,"variant"?: string | null
                  }
                  Update: {
                    "answers"?: Json | null,"bank_version"?: string | null,"chosen_level"?: string | null,"confidence"?: string | null,"estimated_level"?: string | null,"id"?: string,"language"?: string,"start_level"?: string | null,"status"?: string,"taken_at"?: string,"user_id"?: string,"variant"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_tests_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "placement_tests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"production_entries": {
                  Row: {
                    "body": string,"created_at": string,"session_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"session_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"session_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "production_entries_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_sessions"
      referencedColumns: ["id","user_id"]
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
                    "access": string,"active": boolean,"attribution": string | null,"commercial_use": boolean,"content_type": string | null,"created_at": string,"feed_url": string | null,"homepage_url": string,"homepage_url_normalized": string | null,"id": string,"key": string | null,"language": string | null,"last_fetch_error": string | null,"last_fetch_status": string | null,"last_fetched_at": string | null,"last_item_count": number | null,"license_kind": string | null,"license_name": string | null,"license_url": string | null,"license_verified_on": string | null,"name": string,"terms_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access"?: string,"active"?: boolean,"attribution"?: string | null,"commercial_use"?: boolean,"content_type"?: string | null,"created_at"?: string,"feed_url"?: string | null,"homepage_url": string,"homepage_url_normalized"?: never,"id"?: string,"key"?: string | null,"language"?: string | null,"last_fetch_error"?: string | null,"last_fetch_status"?: string | null,"last_fetched_at"?: string | null,"last_item_count"?: number | null,"license_kind"?: string | null,"license_name"?: string | null,"license_url"?: string | null,"license_verified_on"?: string | null,"name": string,"terms_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "access"?: string,"active"?: boolean,"attribution"?: string | null,"commercial_use"?: boolean,"content_type"?: string | null,"created_at"?: string,"feed_url"?: string | null,"homepage_url"?: string,"homepage_url_normalized"?: never,"id"?: string,"key"?: string | null,"language"?: string | null,"last_fetch_error"?: string | null,"last_fetch_status"?: string | null,"last_fetched_at"?: string | null,"last_item_count"?: number | null,"license_kind"?: string | null,"license_name"?: string | null,"license_url"?: string | null,"license_verified_on"?: string | null,"name"?: string,"terms_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    }
                  ]
                },"user_languages": {
                  Row: {
                    "content_types": (string)[],"created_at": string,"focus": string,"id": string,"language": string,"level": string,"purpose": string,"target_level": string,"topics": (string)[],"updated_at": string,"user_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content_types"?: (string)[],"created_at"?: string,"focus"?: string,"id"?: string,"language": string,"level": string,"purpose"?: string,"target_level": string,"topics"?: (string)[],"updated_at"?: string,"user_id": string,"weight"?: number
                  }
                  Update: {
                    "content_types"?: (string)[],"created_at"?: string,"focus"?: string,"id"?: string,"language"?: string,"level"?: string,"purpose"?: string,"target_level"?: string,"topics"?: (string)[],"updated_at"?: string,"user_id"?: string,"weight"?: number
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
                },"user_source_access": {
                  Row: {
                    "created_at": string,"source_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"source_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"source_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_source_access_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_source_access_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_items": {
                  Row: {
                    "added_on": string,"box": number,"content_id": string | null,"created_at": string,"definition": string | null,"due_on": string,"example": string | null,"id": string,"language": string,"last_reviewed_on": string | null,"list_id": string | null,"review_count": number,"source_name": string | null,"source_url": string | null,"status": string,"term": string,"translation": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_on": string,"box"?: number,"content_id"?: string | null,"created_at"?: string,"definition"?: string | null,"due_on": string,"example"?: string | null,"id"?: string,"language": string,"last_reviewed_on"?: string | null,"list_id"?: string | null,"review_count"?: number,"source_name"?: string | null,"source_url"?: string | null,"status"?: string,"term": string,"translation": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "added_on"?: string,"box"?: number,"content_id"?: string | null,"created_at"?: string,"definition"?: string | null,"due_on"?: string,"example"?: string | null,"id"?: string,"language"?: string,"last_reviewed_on"?: string | null,"list_id"?: string | null,"review_count"?: number,"source_name"?: string | null,"source_url"?: string | null,"status"?: string,"term"?: string,"translation"?: string,"updated_at"?: string,"user_id"?: string
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
      foreignKeyName: "vocabulary_items_list_fkey"
      columns: ["list_id","user_id","language"]
isOneToOne: false
      referencedRelation: "vocabulary_lists"
      referencedColumns: ["id","user_id","language"]
    },{
      foreignKeyName: "vocabulary_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_lists": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"id": string,"language": string,"name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"language": string,"name": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"language"?: string,"name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_lists_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "vocabulary_lists_user_id_fkey"
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
                },"vocabulary_translation_usage": {
                  Row: {
                    "day": string,"terms": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"terms": number,"user_id": string
                  }
                  Update: {
                    "day"?: string,"terms"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_translation_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"writing_feedback": {
                  Row: {
                    "attempts": number,"body": string | null,"created_at": string,"feedback": Json | null,"input_tokens": number | null,"model": string | null,"output_tokens": number | null,"prompt_version": string | null,"reviewed_at": string | null,"session_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"body"?: string | null,"created_at"?: string,"feedback"?: Json | null,"input_tokens"?: number | null,"model"?: string | null,"output_tokens"?: number | null,"prompt_version"?: string | null,"reviewed_at"?: string | null,"session_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"body"?: string | null,"created_at"?: string,"feedback"?: Json | null,"input_tokens"?: number | null,"model"?: string | null,"output_tokens"?: number | null,"prompt_version"?: string | null,"reviewed_at"?: string | null,"session_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "writing_feedback_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "mission_sessions"
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
            "claim_mission_generation":
{ Args: { "p_budget_minutes": number,"p_max_attempts"?: number,"p_mission_date": string,"p_stale_after"?: string,"p_user_id": string }; Returns: {
              "claimed": boolean,"mission_id": string,"status": string
            }[]
                           },
"claim_vocabulary_translation":
{ Args: { "p_day": string,"p_limit": number,"p_terms": number,"p_user_id": string }; Returns: boolean
                           },
"claim_writing_feedback_attempt":
{ Args: { "p_session_id": string,"p_user_id": string }; Returns: number
                           },
"complete_mission_generation":
{ Args: { "p_meta": Json,"p_mission_id": string,"p_sessions": Json }; Returns: undefined
                           },
"delete_stale_anonymous_users":
{ Args: { "p_inactive_for"?: string,"p_limit"?: number }; Returns: number
                           },
"fail_mission_generation":
{ Args: { "p_error": string,"p_mission_id": string }; Returns: undefined
                           },
"list_due_mission_users":
{ Args: { "p_active_within"?: string,"p_limit"?: number,"p_max_attempts"?: number,"p_now"?: string }; Returns: {
              "mission_date": string,"user_id": string
            }[]
                           },
"normalize_url":
{ Args: { "url": string }; Returns: string
                           },
"record_correction_review":
{ Args: { "p_box_after": number,"p_card_id": string,"p_due_on_after": string,"p_expected_review_count": number,"p_reviewed_on": string }; Returns: boolean
                           },
"record_grammar_practice":
{ Args: { "p_box_after": number,"p_due_on_after": string,"p_expected_review_count": number,"p_language": string,"p_point_id": string,"p_practised_on": string }; Returns: boolean
                           },
"record_placement_test":
{ Args: { "p_answers"?: Json,"p_bank_version"?: string,"p_chosen_level"?: string,"p_confidence"?: string,"p_estimated_level"?: string,"p_language": string,"p_start_level"?: string,"p_status": string,"p_variant"?: string }; Returns: undefined
                           },
"record_vocabulary_review":
{ Args: { "p_box_after": number,"p_due_on_after": string,"p_expected_review_count": number,"p_grade": string,"p_item_id": string,"p_reviewed_on": string }; Returns: boolean
                           },
"release_session_replacement":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"replace_mission_session":
{ Args: { "p_meta": Json,"p_session": Json,"p_session_id": string,"p_user_id": string }; Returns: undefined
                           },
"reserve_guest_mission":
{ Args: { "p_cap": number,"p_date": string,"p_user_id": string }; Returns: boolean
                           },
"reserve_session_replacement":
{ Args: { "p_max_per_day"?: number,"p_session_id": string,"p_stale_after"?: string,"p_user_id": string }; Returns: undefined
                           },
"save_preferences":
{ Args: { "p_content_types": (string)[] | null,"p_daily_minutes": number,"p_difficulty": string,"p_generation_time": string,"p_goals": Json,"p_time_zone": string,"p_topics": (string)[] | null }; Returns: undefined
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
