
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
                },"content_report": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"reason": string,"target_id": string,"target_kind": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"reason": string,"target_id": string,"target_kind": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"reason"?: string,"target_id"?: string,"target_kind"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"writing_feedback_job": {
                  Row: { production_id: string; user_id: string; session_id: string; text_hash: string; started_at: string; failed: boolean }
                  Insert: { production_id: string; user_id: string; session_id: string; text_hash: string; started_at?: string; failed?: boolean }
                  Update: { failed?: boolean }
                  Relationships: []
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
                },"device_cursor": {
                  Row: {
                    "device_id": string,"last_day": string | null,"last_seq": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"last_day"?: string | null,"last_seq": number,"user_id": string
                  }
                  Update: {
                    "device_id"?: string,"last_day"?: string | null,"last_seq"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
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
                },"error_item": {
                  Row: {
                    "answer": NonNullable<Json>,"correction_id": string,"created_day": string,"error_ref": string,"id": string,"language": string | null,"prompt": NonNullable<Json>,"reworked_day": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"correction_id": string,"created_day": string,"error_ref": string,"id"?: string,"language"?: string | null,"prompt": NonNullable<Json>,"reworked_day"?: string | null,"user_id": string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"correction_id"?: string,"created_day"?: string,"error_ref"?: string,"id"?: string,"language"?: string | null,"prompt"?: NonNullable<Json>,"reworked_day"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "error_item_correction_id_user_id_fkey"
      columns: ["correction_id","user_id"]
isOneToOne: false
      referencedRelation: "correction"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"event_rate": {
                  Row: {
                    "events": number,"user_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "events": number,"user_id": string,"window_start": string
                  }
                  Update: {
                    "events"?: number,"user_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ingest_event": {
                  Row: {
                    "client_event_id": string,"fingerprint": string,"kind": string,"received_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_event_id": string,"fingerprint": string,"kind": string,"received_at"?: string,"user_id": string
                  }
                  Update: {
                    "client_event_id"?: string,"fingerprint"?: string,"kind"?: string,"received_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ingest_state": {
                  Row: {
                    "memo": NonNullable<Json>,"seq": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "memo"?: NonNullable<Json>,"seq"?: number,"user_id": string
                  }
                  Update: {
                    "memo"?: NonNullable<Json>,"seq"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
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
                },"graded_text_job": {
                  Row: {
                    "created_at": string,"density": number,"failure": string | null,"finished_at": string | null,"id": string,"language": string,"level_band": string,"prompt_version": string,"text_id": string | null,"theme": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"density": number,"failure"?: string | null,"finished_at"?: string | null,"id"?: string,"language": string,"level_band": string,"prompt_version": string,"text_id"?: string | null,"theme": string
                  }
                  Update: {
                    "created_at"?: string,"density"?: number,"failure"?: string | null,"finished_at"?: string | null,"id"?: string,"language"?: string,"level_band"?: string,"prompt_version"?: string,"text_id"?: string | null,"theme"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "graded_text_job_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    },
                    {
      foreignKeyName: "graded_text_job_text_id_fkey"
      columns: ["text_id"]
isOneToOne: false
      referencedRelation: "text"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_day": {
                  Row: {
                    "cause": string,"day": string,"first_activity_at": string | null,"time_zone": string,"user_id": string,"validated": boolean,"xp_verified": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cause"?: string,"day": string,"first_activity_at"?: string | null,"time_zone": string,"user_id": string,"validated"?: boolean,"xp_verified"?: number
                  }
                  Update: {
                    "cause"?: string,"day"?: string,"first_activity_at"?: string | null,"time_zone"?: string,"user_id"?: string,"validated"?: boolean,"xp_verified"?: number
                  }
                  Relationships: [
                    
                  ]
                },"legacy_claim_log": {
                  Row: {
                    "claimed_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "claimed_at"?: string,"id"?: never,"user_id"?: string
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
                },"notification_log": {
                  Row: {
                    "day": string,"id": number,"kind": string,"opened_at": string | null,"sent_at": string,"status": string,"template": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"id"?: never,"kind": string,"opened_at"?: string | null,"sent_at"?: string,"status"?: string,"template": string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"id"?: never,"kind"?: string,"opened_at"?: string | null,"sent_at"?: string,"status"?: string,"template"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"production": {
                  Row: {
                    "client_event_id": string | null,"created_at": string,"id": string,"language": string,"mode": string,"session_id": string | null,"task": NonNullable<Json>,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_event_id"?: string | null,"created_at"?: string,"id"?: string,"language": string,"mode": string,"session_id"?: string | null,"task"?: NonNullable<Json>,"text": string,"user_id": string
                  }
                  Update: {
                    "client_event_id"?: string | null,"created_at"?: string,"id"?: string,"language"?: string,"mode"?: string,"session_id"?: string | null,"task"?: NonNullable<Json>,"text"?: string,"user_id"?: string
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
                    "app_active_since": string | null,"created_at": string,"game_settings": NonNullable<Json>,"is_guest": boolean,"known_languages": string[],"legacy_migrated_at": string | null,"native_language": string,"reminder_time": string | null,"time_zone": string,"ui_language": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_active_since"?: string | null,"created_at"?: string,"game_settings"?: NonNullable<Json>,"is_guest"?: boolean,"known_languages"?: string[],"legacy_migrated_at"?: string | null,"native_language"?: string,"reminder_time"?: string | null,"time_zone"?: string,"ui_language"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "app_active_since"?: string | null,"created_at"?: string,"game_settings"?: NonNullable<Json>,"is_guest"?: boolean,"known_languages"?: string[],"legacy_migrated_at"?: string | null,"native_language"?: string,"reminder_time"?: string | null,"time_zone"?: string,"ui_language"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscription": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"failures": number,"id": string,"last_success_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"failures"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"failures"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
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
                    "accepted": boolean | null,"client_event_id": string | null,"correction_id": string,"created_at": string,"id": string,"sentence_index": number,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted"?: boolean | null,"client_event_id"?: string | null,"correction_id": string,"created_at"?: string,"id"?: string,"sentence_index": number,"text": string,"user_id": string
                  }
                  Update: {
                    "accepted"?: boolean | null,"client_event_id"?: string | null,"correction_id"?: string,"created_at"?: string,"id"?: string,"sentence_index"?: number,"text"?: string,"user_id"?: string
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
                },"rewrite_check_job": {
                  Row: { user_id: string; client_event_id: string; fingerprint: string; started_at: string; fixed_error_ids: string[] | null }
                  Insert: { user_id: string; client_event_id: string; fingerprint: string; started_at?: string; fixed_error_ids?: string[] | null }
                  Update: { fixed_error_ids?: string[] | null }
                  Relationships: []
                },"roleplay": {
                  Row: {
                    "created_at": string,"finished_at": string | null,"id": string,"language": string,"level": string,"objectives_met": (boolean)[],"review": Json | null,"scenario_id": string,"status": string,"turns": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"language": string,"level": string,"objectives_met"?: (boolean)[],"review"?: Json | null,"scenario_id": string,"status"?: string,"turns"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"language"?: string,"level"?: string,"objectives_met"?: (boolean)[],"review"?: Json | null,"scenario_id"?: string,"status"?: string,"turns"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roleplay_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"session": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"day": string,"format": number,"id": string,"kind": string,"language": string,"plan": NonNullable<Json>,"served_at": string | null,"started_at": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"day": string,"format"?: number,"id"?: string,"kind"?: string,"language": string,"plan"?: NonNullable<Json>,"served_at"?: string | null,"started_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"day"?: string,"format"?: number,"id"?: string,"kind"?: string,"language"?: string,"plan"?: NonNullable<Json>,"served_at"?: string | null,"started_at"?: string | null,"status"?: string,"user_id"?: string
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
                },"session_step": {
                  Row: {
                    "language": string,"proof": NonNullable<Json>,"session_id": string,"step": string,"user_id": string,"validated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "language": string,"proof"?: NonNullable<Json>,"session_id": string,"step": string,"user_id": string,"validated_at"?: string | null
                  }
                  Update: {
                    "language"?: string,"proof"?: NonNullable<Json>,"session_id"?: string,"step"?: string,"user_id"?: string,"validated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_step_session_id_user_id_language_fkey"
      columns: ["session_id","user_id","language"]
isOneToOne: false
      referencedRelation: "session"
      referencedColumns: ["id","user_id","language"]
    }
                  ]
                },"setting_change": {
                  Row: {
                    "changed_at": string,"effective_day": string,"id": number,"key": string,"user_id": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"effective_day": string,"id"?: never,"key": string,"user_id": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "changed_at"?: string,"effective_day"?: string,"id"?: never,"key"?: string,"user_id"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
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
                    "best": number,"best_set_on": string | null,"current": number,"freezes": number,"freezes_granted_through": string | null,"last_day": string | null,"last_repair_day": string | null,"mode": string,"time_zone_changed_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best"?: number,"best_set_on"?: string | null,"current"?: number,"freezes"?: number,"freezes_granted_through"?: string | null,"last_day"?: string | null,"last_repair_day"?: string | null,"mode"?: string,"time_zone_changed_at"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "best"?: number,"best_set_on"?: string | null,"current"?: number,"freezes"?: number,"freezes_granted_through"?: string | null,"last_day"?: string | null,"last_repair_day"?: string | null,"mode"?: string,"time_zone_changed_at"?: string | null,"updated_at"?: string,"user_id"?: string
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
                },"text": {
                  Row: {
                    "audio_path": string | null,"body": string,"checks": NonNullable<Json>,"created_at": string,"density": number,"grammar_point": string | null,"id": string,"language": string,"level_band": string,"listening_segment": Json | null,"model": string | null,"new_words": NonNullable<Json>,"prompt_version": string,"status": string,"theme": string,"title": string,"variant": number,"word_count": number,"writing_task": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_path"?: string | null,"body": string,"checks"?: NonNullable<Json>,"created_at"?: string,"density": number,"grammar_point"?: string | null,"id"?: string,"language": string,"level_band": string,"listening_segment"?: Json | null,"model"?: string | null,"new_words"?: NonNullable<Json>,"prompt_version": string,"status"?: string,"theme": string,"title": string,"variant"?: number,"word_count": number,"writing_task"?: string | null
                  }
                  Update: {
                    "audio_path"?: string | null,"body"?: string,"checks"?: NonNullable<Json>,"created_at"?: string,"density"?: number,"grammar_point"?: string | null,"id"?: string,"language"?: string,"level_band"?: string,"listening_segment"?: Json | null,"model"?: string | null,"new_words"?: NonNullable<Json>,"prompt_version"?: string,"status"?: string,"theme"?: string,"title"?: string,"variant"?: number,"word_count"?: number,"writing_task"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "text_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"text_item": {
                  Row: {
                    "id": string,"kind": string,"listening_only": boolean,"position": number,"prompt": NonNullable<Json>,"step": string,"text_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind": string,"listening_only"?: boolean,"position": number,"prompt": NonNullable<Json>,"step": string,"text_id": string
                  }
                  Update: {
                    "id"?: string,"kind"?: string,"listening_only"?: boolean,"position"?: number,"prompt"?: NonNullable<Json>,"step"?: string,"text_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "text_item_text_id_fkey"
      columns: ["text_id"]
isOneToOne: false
      referencedRelation: "text"
      referencedColumns: ["id"]
    }
                  ]
                },"text_item_key": {
                  Row: {
                    "accept": NonNullable<Json>,"answer": NonNullable<Json>,"item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accept"?: NonNullable<Json>,"answer": NonNullable<Json>,"item_id": string
                  }
                  Update: {
                    "accept"?: NonNullable<Json>,"answer"?: NonNullable<Json>,"item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "text_item_key_item_id_fkey"
      columns: ["item_id"]
isOneToOne: true
      referencedRelation: "text_item"
      referencedColumns: ["id"]
    }
                  ]
                },"text_read": {
                  Row: {
                    "first_read_day": string,"text_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_read_day": string,"text_id": string,"user_id": string
                  }
                  Update: {
                    "first_read_day"?: string,"text_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "text_read_text_id_fkey"
      columns: ["text_id"]
isOneToOne: false
      referencedRelation: "text"
      referencedColumns: ["id"]
    }
                  ]
                },"timezone_change": {
                  Row: {
                    "created_at": string,"effective_at": string,"id": number,"time_zone": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"effective_at": string,"id"?: never,"time_zone": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"effective_at"?: string,"id"?: never,"time_zone"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ui_event": {
                  Row: {
                    "client_event_id": string,"id": number,"name": string,"occurred_at": string,"received_at": string,"user_id": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "client_event_id": string,"id"?: never,"name": string,"occurred_at": string,"received_at"?: string,"user_id": string,"value"?: NonNullable<Json>
                  }
                  Update: {
                    "client_event_id"?: string,"id"?: never,"name"?: string,"occurred_at"?: string,"received_at"?: string,"user_id"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"unit_progress": {
                  Row: {
                    "best_score": number | null,"language": string,"passed_at": string | null,"passed_version": string | null,"steps": NonNullable<Json>,"test_attempts": number,"unit_id": string,"updated_at": string,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_score"?: number | null,"language": string,"passed_at"?: string | null,"passed_version"?: string | null,"steps"?: NonNullable<Json>,"test_attempts"?: number,"unit_id": string,"updated_at"?: string,"user_id": string,"version": string
                  }
                  Update: {
                    "best_score"?: number | null,"language"?: string,"passed_at"?: string | null,"passed_version"?: string | null,"steps"?: NonNullable<Json>,"test_attempts"?: number,"unit_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unit_progress_language_fkey"
      columns: ["language"]
isOneToOne: false
      referencedRelation: "language"
      referencedColumns: ["code"]
    }
                  ]
                },"unit_test": {
                  Row: {
                    "client_event_id": string,"created_at": string,"id": string,"missed": (string)[],"passed": boolean,"score": number,"unit_id": string,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_event_id": string,"created_at"?: string,"id": string,"missed"?: (string)[],"passed": boolean,"score": number,"unit_id": string,"user_id": string,"version": string
                  }
                  Update: {
                    "client_event_id"?: string,"created_at"?: string,"id"?: string,"missed"?: (string)[],"passed"?: boolean,"score"?: number,"unit_id"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"xp_ledger": {
                  Row: {
                    "amount": number,"attempt_id": number | null,"created_at": string,"day": string,"id": number,"language": string | null,"league_eligible": boolean,"meta": NonNullable<Json>,"reason": string,"review_log_id": number | null,"rule_version": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"attempt_id"?: number | null,"created_at"?: string,"day": string,"id"?: never,"language"?: string | null,"league_eligible"?: boolean,"meta"?: NonNullable<Json>,"reason": string,"review_log_id"?: number | null,"rule_version"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"attempt_id"?: number | null,"created_at"?: string,"day"?: string,"id"?: never,"language"?: string | null,"league_eligible"?: boolean,"meta"?: NonNullable<Json>,"reason"?: string,"review_log_id"?: number | null,"rule_version"?: string,"user_id"?: string
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
            read_verified_sentences: { Args: { p_user_id: string; p_correction_ids: string[] }; Returns: { correction_id: string; sentence_index: number }[] };
"configure_reminder":
{ Args: { p_enabled: boolean; p_time: string; p_weekly_summary: boolean; p_endpoint?: string; p_p256dh?: string; p_auth?: string; p_user_agent?: string; p_reset?: boolean }; Returns: undefined },
"reminders_due":
{ Args: { p_at: string; p_after?: string; p_only?: string }; Returns: { user_id: string; day: string; locale: string; delivery_mode: string; template: string; daily_minutes: number; active_days: number; rewrites: number }[] },
"claim_legacy_data":
{ Args: Record<PropertyKey, never>; Returns: Json },
"send_feedback":
{ Args: { p_category: string; p_message: string; p_page?: string; p_app_version?: string }; Returns: undefined },
"claim_reminder":
{ Args: { p_user_id: string; p_day: string; p_at: string; p_template: string; p_mode: string }; Returns: { log_id: number; subscription_id: string; endpoint: string; p256dh: string; auth: string }[] },
"mark_reminder_opened":
{ Args: { p_log_id: number }; Returns: undefined },
"metrics_report":
{ Args: { "p_as_of"?: string,"p_month": string }; Returns: Json },
"claim_graded_text_job":
{ Args: { "p_density": number,"p_language": string,"p_level": string,"p_theme": string,"p_version": string }; Returns: Json },
  "claim_writing_feedback_job":
  { Args: { p_user_id: string; p_production_id: string }; Returns: string },
  "publish_graded_text":
{ Args: { "p_items": Json,"p_job": string,"p_text": Json }; Returns: string },
            "ai_spend":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "calls": number,"cost_usd": number,"input_tokens": number,"model": string,"output_tokens": number,"purpose": string
            }[]
                           },
"ai_spend_month":
{ Args: { "p_at": string }; Returns: number
                           },
"claim_event_rate":
{ Args: { "p_count": number,"p_limit": number,"p_user_id": string }; Returns: boolean
                           },
"claim_quota":
{ Args: { "p_day": string,"p_kind": string,"p_limit": number,"p_user_id": string }; Returns: boolean
                           },
"delete_push_subscription":
{ Args: { "p_endpoint": string }; Returns: boolean
                           },
"ingest_batch":
{ Args: { "p_expected_seq": number,"p_payload": Json,"p_user_id": string }; Returns: Json
                           },
"is_allowed_push_endpoint":
{ Args: { "p_endpoint": string }; Returns: boolean
                           },
"is_valid_game_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: boolean
                           },
"is_valid_unit_steps":
{ Args: { "p_steps": Json }; Returns: boolean
                           },
"is_valid_weekdays":
{ Args: { "p_days": (number)[] }; Returns: boolean
                           },
"learning_day_at":
{ Args: { "p_at": string,"p_time_zone": string }; Returns: string
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
"record_ai_call":
{ Args: { "p_batch": boolean,"p_cache_read_tokens": number,"p_cache_write_tokens": number,"p_cost_usd": number,"p_input_tokens": number,"p_model": string,"p_output_tokens": number,"p_prompt_version": string,"p_purpose": string,"p_status": string,"p_user_id": string }; Returns: number
                           },
"release_quota":
{ Args: { "p_day": string,"p_kind": string,"p_user_id": string }; Returns: undefined
                           },
"report_content":
{ Args: { "p_note"?: string,"p_reason": string,"p_target_id": string,"p_target_kind": string }; Returns: string
                           },
"save_enrollments":
{ Args: { "p_enrollments": Json }; Returns: {
              "active": boolean,
"created_at": string,
"daily_minutes": number,
"days": (number)[],
"focus": NonNullable<Json>,
"id": string,
"language": string,
"position": number,
"purpose": string | null,
"target_level": string | null,
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "enrollment"
        isOneToOne: false
        isSetofReturn: true
      } },
"save_game_settings":
{ Args: { "p_settings": Json }; Returns: {
              "app_active_since": string | null,
"created_at": string,
"game_settings": NonNullable<Json>,
"is_guest": boolean,
"known_languages": string[],
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
"save_known_languages":
{ Args: { "p_languages": string[] }; Returns: undefined },
"save_profile":
{ Args: { "p_native_language": string,"p_reminder_time"?: string,"p_time_zone": string,"p_ui_language": string }; Returns: {
              "app_active_since": string | null,
"created_at": string,
"game_settings": NonNullable<Json>,
"is_guest": boolean,
"known_languages": string[],
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
"save_push_subscription":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string,"p_user_agent"?: string }; Returns: string
                           },
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
