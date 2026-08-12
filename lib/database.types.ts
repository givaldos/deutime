export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      athlete_position_preferences: {
        Row: {
          athlete_id: string
          created_at: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          position_code?: string
          priority?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_position_preferences_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "athlete_position_preferences_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
        ]
      }
      athlete_private: {
        Row: {
          athlete_id: string
          birth_date: string | null
          created_at: string
          email: string | null
          notes: string | null
          phone_e164: string | null
          privacy_terms_accepted_at: string | null
          privacy_terms_version: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          notes?: string | null
          phone_e164?: string | null
          privacy_terms_accepted_at?: string | null
          privacy_terms_version?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          notes?: string | null
          phone_e164?: string | null
          privacy_terms_accepted_at?: string | null
          privacy_terms_version?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_private_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      athlete_public_consents: {
        Row: {
          athlete_id: string
          created_at: string
          evidence: string
          granted_at: string | null
          purpose: Database["public"]["Enums"]["athlete_public_consent_purpose"]
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          terms_version: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          evidence: string
          granted_at?: string | null
          purpose: Database["public"]["Enums"]["athlete_public_consent_purpose"]
          revoked_at?: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          terms_version: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          evidence?: string
          granted_at?: string | null
          purpose?: Database["public"]["Enums"]["athlete_public_consent_purpose"]
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          team_id?: string
          terms_version?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_public_consents_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      athletes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          joined_on: string | null
          photo_path: string | null
          preferred_name: string | null
          public_profile: boolean
          registration_number: number
          registration_source: Database["public"]["Enums"]["registration_source"]
          removed_at: string | null
          removed_by: string | null
          shirt_number: number | null
          status: Database["public"]["Enums"]["athlete_status"]
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          joined_on?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          public_profile?: boolean
          registration_number?: never
          registration_source?: Database["public"]["Enums"]["registration_source"]
          removed_at?: string | null
          removed_by?: string | null
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["athlete_status"]
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          joined_on?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          public_profile?: boolean
          registration_number?: never
          registration_source?: Database["public"]["Enums"]["registration_source"]
          removed_at?: string | null
          removed_by?: string | null
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["athlete_status"]
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
          request_id: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          metadata?: Json
          request_id?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          metadata?: Json
          request_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_consents: {
        Row: {
          athlete_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          evidence: string
          granted_at: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          evidence: string
          granted_at?: string | null
          revoked_at?: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          evidence?: string
          granted_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_consents_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      craque_vote_receipts: {
        Row: {
          created_at: string
          expires_at: string
          token_hash: string
          vote_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          token_hash: string
          vote_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token_hash?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "craque_vote_receipts_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "craque_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      craque_votes: {
        Row: {
          anonymized_at: string | null
          candidate_athlete_id: string
          created_at: string
          id: string
          match_id: string
          receipt_token_hash: string | null
          team_id: string
          voter_hash: string | null
        }
        Insert: {
          anonymized_at?: string | null
          candidate_athlete_id: string
          created_at?: string
          id?: string
          match_id: string
          receipt_token_hash?: string | null
          team_id: string
          voter_hash?: string | null
        }
        Update: {
          anonymized_at?: string | null
          candidate_athlete_id?: string
          created_at?: string
          id?: string
          match_id?: string
          receipt_token_hash?: string | null
          team_id?: string
          voter_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "craque_votes_candidate_athlete_id_fkey"
            columns: ["candidate_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craque_votes_candidate_team_fkey"
            columns: ["candidate_athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "craque_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craque_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craque_votes_match_team_fkey"
            columns: ["match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "craque_votes_match_team_fkey"
            columns: ["match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_access_credentials: {
        Row: {
          athlete_id: string
          athlete_user_id_at_issue: string | null
          created_at: string
          event_id: string
          exchange_count: number
          expires_at: string
          id: string
          issued_by: string
          last_exchanged_at: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          secret_hash: string
          team_id: string
        }
        Insert: {
          athlete_id: string
          athlete_user_id_at_issue?: string | null
          created_at?: string
          event_id: string
          exchange_count?: number
          expires_at: string
          id?: string
          issued_by: string
          last_exchanged_at?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          secret_hash: string
          team_id: string
        }
        Update: {
          athlete_id?: string
          athlete_user_id_at_issue?: string | null
          created_at?: string
          event_id?: string
          exchange_count?: number
          expires_at?: string
          id?: string
          issued_by?: string
          last_exchanged_at?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          secret_hash?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_access_credentials_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_access_credentials_event_id_athlete_id_fkey"
            columns: ["event_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "event_attendance"
            referencedColumns: ["event_id", "athlete_id"]
          },
          {
            foreignKeyName: "event_access_credentials_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          responded_at: string | null
          responded_by: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          responded_at?: string | null
          responded_by?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          responded_at?: string | null
          responded_by?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_attendance_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_capability_sessions: {
        Row: {
          absolute_expires_at: string
          athlete_id: string
          athlete_user_id_at_issue: string | null
          created_at: string
          credential_id: string
          event_id: string
          id: string
          idle_expires_at: string
          last_seen_at: string
          revocation_reason: string | null
          revoked_at: string | null
          secret_hash: string
          team_id: string
        }
        Insert: {
          absolute_expires_at: string
          athlete_id: string
          athlete_user_id_at_issue?: string | null
          created_at?: string
          credential_id: string
          event_id: string
          id?: string
          idle_expires_at: string
          last_seen_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          secret_hash: string
          team_id: string
        }
        Update: {
          absolute_expires_at?: string
          athlete_id?: string
          athlete_user_id_at_issue?: string | null
          created_at?: string
          credential_id?: string
          event_id?: string
          id?: string
          idle_expires_at?: string
          last_seen_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          secret_hash?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_capability_sessions_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_capability_sessions_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "event_access_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_capability_sessions_event_id_athlete_id_fkey"
            columns: ["event_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "event_attendance"
            referencedColumns: ["event_id", "athlete_id"]
          },
          {
            foreignKeyName: "event_capability_sessions_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_changes: {
        Row: {
          command_id: string
          event_id: string
          id: number
          kind: Database["public"]["Enums"]["event_change_kind"]
          next_starts_at: string | null
          next_status: Database["public"]["Enums"]["event_status"]
          occurred_at: string
          previous_starts_at: string | null
          previous_status: Database["public"]["Enums"]["event_status"] | null
          schedule_version: number
          scope: string
          series_id: string | null
          team_id: string
        }
        Insert: {
          command_id: string
          event_id: string
          id?: never
          kind: Database["public"]["Enums"]["event_change_kind"]
          next_starts_at?: string | null
          next_status: Database["public"]["Enums"]["event_status"]
          occurred_at?: string
          previous_starts_at?: string | null
          previous_status?: Database["public"]["Enums"]["event_status"] | null
          schedule_version: number
          scope: string
          series_id?: string | null
          team_id: string
        }
        Update: {
          command_id?: string
          event_id?: string
          id?: never
          kind?: Database["public"]["Enums"]["event_change_kind"]
          next_starts_at?: string | null
          next_status?: Database["public"]["Enums"]["event_status"]
          occurred_at?: string
          previous_starts_at?: string | null
          previous_status?: Database["public"]["Enums"]["event_status"] | null
          schedule_version?: number
          scope?: string
          series_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_changes_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "event_commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_changes_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_changes_series_id_team_id_fkey"
            columns: ["series_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_changes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_commands: {
        Row: {
          actor_id: string
          created_at: string
          event_id: string | null
          id: string
          kind: Database["public"]["Enums"]["event_command_kind"]
          payload_hash: string
          request_id: string
          result: Json | null
          series_id: string | null
          team_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["event_command_kind"]
          payload_hash: string
          request_id: string
          result?: Json | null
          series_id?: string | null
          team_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_command_kind"]
          payload_hash?: string
          request_id?: string
          result?: Json | null
          series_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_commands_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_commands_series_id_team_id_fkey"
            columns: ["series_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_commands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lineup_commands: {
        Row: {
          actor_id: string
          created_at: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["event_lineup_command_kind"]
          request_id: string
          result: Json
          team_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["event_lineup_command_kind"]
          request_id: string
          result: Json
          team_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_lineup_command_kind"]
          request_id?: string
          result?: Json
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_commands_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_lineup_commands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lineup_exclusions: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          event_id: string
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          event_id: string
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          event_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_exclusions_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_lineup_exclusions_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_lineup_revision_spots: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          position_code: string | null
          revision_id: string
          revision_squad_id: string
          slot_kind: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order: number
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          position_code?: string | null
          revision_id: string
          revision_squad_id: string
          slot_kind: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order: number
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          position_code?: string | null
          revision_id?: string
          revision_squad_id?: string
          slot_kind?: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_revision_spots_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_lineup_revision_spots_revision_squad_id_revision_id__fkey"
            columns: ["revision_squad_id", "revision_id", "event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_lineup_revision_squads"
            referencedColumns: ["id", "revision_id", "event_id", "team_id"]
          },
        ]
      }
      event_lineup_revision_squads: {
        Row: {
          badge_key: Database["public"]["Enums"]["internal_squad_badge_key"]
          color: string | null
          created_at: string
          event_id: string
          id: string
          name: string
          revision_id: string
          sort_order: number
          source_squad_id: string | null
          team_id: string
        }
        Insert: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color?: string | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          revision_id: string
          sort_order: number
          source_squad_id?: string | null
          team_id: string
        }
        Update: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color?: string | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          revision_id?: string
          sort_order?: number
          source_squad_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_revision_squads_revision_id_event_id_team_id_fkey"
            columns: ["revision_id", "event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_lineup_revisions"
            referencedColumns: ["id", "event_id", "team_id"]
          },
          {
            foreignKeyName: "event_lineup_revision_squads_source_squad_id_fkey"
            columns: ["source_squad_id"]
            isOneToOne: false
            referencedRelation: "event_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lineup_revisions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          published_at: string
          published_by: string
          revision: number
          team_id: string
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          published_at?: string
          published_by: string
          revision: number
          team_id: string
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          published_at?: string
          published_by?: string
          revision?: number
          team_id?: string
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_revisions_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_matches: {
        Row: {
          craque_voting_closes_at: string | null
          created_at: string
          created_by: string
          event_id: string
          external_opponent_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          ordinal: number
          public_mode: Database["public"]["Enums"]["match_public_mode"]
          status: Database["public"]["Enums"]["match_status"]
          team_id: string
          updated_at: string
          video_id: string | null
          video_provider: string | null
        }
        Insert: {
          craque_voting_closes_at?: string | null
          created_at?: string
          created_by: string
          event_id: string
          external_opponent_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          ordinal: number
          public_mode?: Database["public"]["Enums"]["match_public_mode"]
          status?: Database["public"]["Enums"]["match_status"]
          team_id: string
          updated_at?: string
          video_id?: string | null
          video_provider?: string | null
        }
        Update: {
          craque_voting_closes_at?: string | null
          created_at?: string
          created_by?: string
          event_id?: string
          external_opponent_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          ordinal?: number
          public_mode?: Database["public"]["Enums"]["match_public_mode"]
          status?: Database["public"]["Enums"]["match_status"]
          team_id?: string
          updated_at?: string
          video_id?: string | null
          video_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_matches_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_series: {
        Row: {
          attendance_deadline_offset: string
          created_at: string
          created_by: string
          duration_minutes: number
          ends_on: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          local_start_time: string
          organization_mode: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule: string
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_on: string
          team_id: string
          timezone: string
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          attendance_deadline_offset?: string
          created_at?: string
          created_by: string
          duration_minutes: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          local_start_time: string
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule: string
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_on: string
          team_id: string
          timezone?: string
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          attendance_deadline_offset?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          local_start_time?: string
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule?: string
          sport_format?: Database["public"]["Enums"]["sport_format"]
          starts_on?: string
          team_id?: string
          timezone?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_venue_id_team_id_fkey"
            columns: ["venue_id", "team_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_squads: {
        Row: {
          badge_key: Database["public"]["Enums"]["internal_squad_badge_key"]
          color: string | null
          created_at: string
          event_id: string
          id: string
          internal_team_id: string | null
          is_official: boolean
          name: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          updated_at: string
        }
        Insert: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color?: string | null
          created_at?: string
          event_id: string
          id?: string
          internal_team_id?: string | null
          is_official?: boolean
          name: string
          sort_order?: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          updated_at?: string
        }
        Update: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color?: string | null
          created_at?: string
          event_id?: string
          id?: string
          internal_team_id?: string | null
          is_official?: boolean
          name?: string
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_squads_event_id_team_id_sport_format_fkey"
            columns: ["event_id", "team_id", "sport_format"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id", "sport_format"]
          },
          {
            foreignKeyName: "event_squads_internal_team_fk"
            columns: ["internal_team_id", "team_id"]
            isOneToOne: false
            referencedRelation: "team_squad_presets"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_whatsapp_reminder_commands: {
        Row: {
          actor_id: string
          created_at: string
          event_id: string
          id: string
          request_id: string
          result: Json
          slot_id: string | null
          team_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_id: string
          id?: string
          request_id: string
          result: Json
          slot_id?: string | null
          team_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_id?: string
          id?: string
          request_id?: string
          result?: Json
          slot_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_whatsapp_reminder_commands_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_whatsapp_reminder_commands_slot_id_team_id_fkey"
            columns: ["slot_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_whatsapp_reminder_slots"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_whatsapp_reminder_commands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_whatsapp_reminder_settings: {
        Row: {
          configured_by: string
          created_at: string
          event_id: string
          first_offset_minutes: number
          is_override: boolean
          second_offset_minutes: number
          team_id: string
          updated_at: string
        }
        Insert: {
          configured_by: string
          created_at?: string
          event_id: string
          first_offset_minutes: number
          is_override?: boolean
          second_offset_minutes: number
          team_id: string
          updated_at?: string
        }
        Update: {
          configured_by?: string
          created_at?: string
          event_id?: string
          first_offset_minutes?: number
          is_override?: boolean
          second_offset_minutes?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_whatsapp_reminder_settings_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_whatsapp_reminder_slots: {
        Row: {
          consumed_at: string | null
          created_at: string
          event_id: string
          id: string
          observed_schedule_version: number
          scheduled_for: string
          slot_key: Database["public"]["Enums"]["event_reminder_slot_key"]
          status: Database["public"]["Enums"]["event_reminder_slot_status"]
          status_reason: string | null
          team_id: string
          template_key: string
          template_version: string
          triggered_manually: boolean
          updated_at: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          observed_schedule_version: number
          scheduled_for: string
          slot_key: Database["public"]["Enums"]["event_reminder_slot_key"]
          status?: Database["public"]["Enums"]["event_reminder_slot_status"]
          status_reason?: string | null
          team_id: string
          template_key: string
          template_version: string
          triggered_manually?: boolean
          updated_at?: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          observed_schedule_version?: number
          scheduled_for?: string
          slot_key?: Database["public"]["Enums"]["event_reminder_slot_key"]
          status?: Database["public"]["Enums"]["event_reminder_slot_status"]
          status_reason?: string | null
          team_id?: string
          template_key?: string
          template_version?: string
          triggered_manually?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_whatsapp_reminder_slots_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_deadline: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_series_exception: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          opponent_name: string | null
          organization_mode: Database["public"]["Enums"]["organization_mode"]
          public_id: string
          schedule_version: number
          series_id: string | null
          series_position: number | null
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          team_id: string
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          attendance_deadline?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          is_series_exception?: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          opponent_name?: string | null
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          public_id?: string
          schedule_version?: number
          series_id?: string | null
          series_position?: number | null
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          team_id: string
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          attendance_deadline?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          is_series_exception?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          opponent_name?: string | null
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          public_id?: string
          schedule_version?: number
          series_id?: string | null
          series_position?: number | null
          sport_format?: Database["public"]["Enums"]["sport_format"]
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          team_id?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_series_id_team_id_fkey"
            columns: ["series_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_team_id_fkey"
            columns: ["venue_id", "team_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      lineup_spots: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          field_x: number | null
          field_y: number | null
          id: string
          position_code: string | null
          slot_kind: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          squad_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          field_x?: number | null
          field_y?: number | null
          id?: string
          position_code?: string | null
          slot_kind?: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order?: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          squad_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          field_x?: number | null
          field_y?: number | null
          id?: string
          position_code?: string | null
          slot_kind?: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          squad_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineup_spots_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "lineup_spots_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
          {
            foreignKeyName: "lineup_spots_squad_id_team_id_event_id_sport_format_fkey"
            columns: ["squad_id", "team_id", "event_id", "sport_format"]
            isOneToOne: false
            referencedRelation: "event_squads"
            referencedColumns: ["id", "team_id", "event_id", "sport_format"]
          },
        ]
      }
      match_comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          match_id: string
          reason: string
          reporter_user_id: string | null
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["match_comment_report_status"]
          team_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          match_id: string
          reason: string
          reporter_user_id?: string | null
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["match_comment_report_status"]
          team_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          match_id?: string
          reason?: string
          reporter_user_id?: string | null
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["match_comment_report_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_comment_reports_comment_id_match_id_team_id_fkey"
            columns: ["comment_id", "match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "match_comments"
            referencedColumns: ["id", "match_id", "team_id"]
          },
        ]
      }
      match_comments: {
        Row: {
          author_athlete_id: string | null
          author_display_name: string
          author_user_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          match_id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          parent_comment_id: string | null
          status: Database["public"]["Enums"]["match_comment_status"]
          team_id: string
        }
        Insert: {
          author_athlete_id?: string | null
          author_display_name: string
          author_user_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key: string
          match_id: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          parent_comment_id?: string | null
          status?: Database["public"]["Enums"]["match_comment_status"]
          team_id: string
        }
        Update: {
          author_athlete_id?: string | null
          author_display_name?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string
          match_id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          parent_comment_id?: string | null
          status?: Database["public"]["Enums"]["match_comment_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_comments_author_athlete_id_team_id_fkey"
            columns: ["author_athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_comments_match_id_team_id_fkey"
            columns: ["match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_comments_match_id_team_id_fkey"
            columns: ["match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_comments_parent_comment_id_match_id_team_id_fkey"
            columns: ["parent_comment_id", "match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "match_comments"
            referencedColumns: ["id", "match_id", "team_id"]
          },
        ]
      }
      match_events: {
        Row: {
          assist_athlete_id: string | null
          athlete_id: string | null
          created_at: string
          created_by: string
          delta: number | null
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["match_event_kind"]
          match_id: string
          minute: number | null
          notes: string | null
          side_id: string | null
          team_id: string
        }
        Insert: {
          assist_athlete_id?: string | null
          athlete_id?: string | null
          created_at?: string
          created_by: string
          delta?: number | null
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["match_event_kind"]
          match_id: string
          minute?: number | null
          notes?: string | null
          side_id?: string | null
          team_id: string
        }
        Update: {
          assist_athlete_id?: string | null
          athlete_id?: string | null
          created_at?: string
          created_by?: string
          delta?: number | null
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["match_event_kind"]
          match_id?: string
          minute?: number | null
          notes?: string | null
          side_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_athlete_id_team_id_fkey"
            columns: ["assist_athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_events_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_side_id_fkey"
            columns: ["side_id"]
            isOneToOne: false
            referencedRelation: "match_sides"
            referencedColumns: ["id"]
          },
        ]
      }
      match_incidents: {
        Row: {
          assist_athlete_id: string | null
          athlete_id: string
          created_at: string
          created_by: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["match_incident_kind"]
          minute: number | null
          notes: string | null
          scoring_side: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assist_athlete_id?: string | null
          athlete_id: string
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["match_incident_kind"]
          minute?: number | null
          notes?: string | null
          scoring_side?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assist_athlete_id?: string | null
          athlete_id?: string
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["match_incident_kind"]
          minute?: number | null
          notes?: string | null
          scoring_side?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_incidents_assist_athlete_id_team_id_fkey"
            columns: ["assist_athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_incidents_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_incidents_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      match_participations: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          event_id: string
          id: string
          match_id: string
          side_id: string
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          match_id: string
          side_id: string
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          match_id?: string
          side_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participations_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participations_side_id_fkey"
            columns: ["side_id"]
            isOneToOne: false
            referencedRelation: "match_sides"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reports: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          notes: string | null
          side_a_label: string
          side_a_score: number
          side_b_label: string
          side_b_score: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          side_a_label?: string
          side_a_score?: number
          side_b_label?: string
          side_b_score?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          side_a_label?: string
          side_a_score?: number
          side_b_label?: string
          side_b_score?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reports_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      match_sides: {
        Row: {
          created_at: string
          event_id: string
          external_snapshot: Json | null
          id: string
          label: string
          match_id: string
          side_index: number
          squad_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          external_snapshot?: Json | null
          id?: string
          label: string
          match_id: string
          side_index: number
          squad_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          external_snapshot?: Json | null
          id?: string
          label?: string
          match_id?: string
          side_index?: number
          squad_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_sides_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "event_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sides_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "public_match_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sides_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "event_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_attempts: {
        Row: {
          attempt_number: number
          callback_token_hash: string
          completed_at: string | null
          delivery_status: string
          id: string
          outbox_id: string
          provider_error_code: string | null
          provider_message_id: string | null
          started_at: string
          team_id: string
        }
        Insert: {
          attempt_number: number
          callback_token_hash: string
          completed_at?: string | null
          delivery_status?: string
          id?: string
          outbox_id: string
          provider_error_code?: string | null
          provider_message_id?: string | null
          started_at?: string
          team_id: string
        }
        Update: {
          attempt_number?: number
          callback_token_hash?: string
          completed_at?: string | null
          delivery_status?: string
          id?: string
          outbox_id?: string
          provider_error_code?: string | null
          provider_message_id?: string | null
          started_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_outbox_id_team_id_fkey"
            columns: ["outbox_id", "team_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      notification_delivery_events: {
        Row: {
          attempt_id: string
          delivery_status: string
          id: number
          outbox_id: string
          provider_error_code: string | null
          provider_message_id: string | null
          received_at: string
          team_id: string
        }
        Insert: {
          attempt_id: string
          delivery_status: string
          id?: never
          outbox_id: string
          provider_error_code?: string | null
          provider_message_id?: string | null
          received_at?: string
          team_id: string
        }
        Update: {
          attempt_id?: string
          delivery_status?: string
          id?: never
          outbox_id?: string
          provider_error_code?: string | null
          provider_message_id?: string | null
          received_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "notification_delivery_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_events_outbox_id_team_id_fkey"
            columns: ["outbox_id", "team_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          athlete_id: string | null
          attempts: number
          available_at: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          dedupe_key: string
          effect_started_at: string | null
          event_id: string | null
          failure_class: string | null
          id: string
          intent_version: number
          last_error: string | null
          lease_expires_at: string | null
          lease_token: string | null
          payload: Json
          processed_at: string | null
          provider_message_id: string | null
          recipient: string
          reminder_slot_id: string | null
          requested_by: string | null
          requires_review: boolean
          status: Database["public"]["Enums"]["message_status"]
          team_id: string
          template_key: string
          template_version: string
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          attempts?: number
          available_at?: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          dedupe_key: string
          effect_started_at?: string | null
          event_id?: string | null
          failure_class?: string | null
          id?: string
          intent_version?: number
          last_error?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient: string
          reminder_slot_id?: string | null
          requested_by?: string | null
          requires_review?: boolean
          status?: Database["public"]["Enums"]["message_status"]
          team_id: string
          template_key: string
          template_version?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          attempts?: number
          available_at?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          dedupe_key?: string
          effect_started_at?: string | null
          event_id?: string | null
          failure_class?: string | null
          id?: string
          intent_version?: number
          last_error?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient?: string
          reminder_slot_id?: string | null
          requested_by?: string | null
          requires_review?: boolean
          status?: Database["public"]["Enums"]["message_status"]
          team_id?: string
          template_key?: string
          template_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "notification_outbox_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "notification_outbox_reminder_slot_team_fk"
            columns: ["reminder_slot_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_whatsapp_reminder_slots"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "notification_outbox_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_position_preferences: {
        Row: {
          created_at: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          user_id: string
        }
        Insert: {
          created_at?: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          user_id: string
        }
        Update: {
          created_at?: string
          position_code?: string
          priority?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_position_preferences_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
        ]
      }
      player_profiles: {
        Row: {
          bio: string | null
          birth_date: string | null
          created_at: string
          display_name: string
          handle: string
          handle_changed_at: string | null
          is_public: boolean
          phone_verified_at: string
          photo_path: string | null
          preferred_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name: string
          handle: string
          handle_changed_at?: string | null
          is_public?: boolean
          phone_verified_at: string
          photo_path?: string | null
          preferred_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          handle_changed_at?: string | null
          is_public?: boolean
          phone_verified_at?: string
          photo_path?: string | null
          preferred_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          category: string
          code: string
          label: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
        }
        Insert: {
          category: string
          code: string
          label: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
        }
        Update: {
          category?: string
          code?: string
          label?: string
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      runtime_controls: {
        Row: {
          control: Database["public"]["Enums"]["runtime_control_key"]
          enabled: boolean
          updated_at: string
        }
        Insert: {
          control: Database["public"]["Enums"]["runtime_control_key"]
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          control?: Database["public"]["Enums"]["runtime_control_key"]
          enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      team_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          feature: Database["public"]["Enums"]["feature_key"]
          team_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature: Database["public"]["Enums"]["feature_key"]
          team_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature?: Database["public"]["Enums"]["feature_key"]
          team_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_feature_flags_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_media: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string
          id: string
          is_featured: boolean
          kind: string
          sort_order: number
          storage_path: string
          team_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_featured?: boolean
          kind: string
          sort_order?: number
          storage_path: string
          team_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_featured?: boolean
          kind?: string
          sort_order?: number
          storage_path?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_media_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_public_profiles: {
        Row: {
          about: string | null
          created_at: string
          facebook_url: string | null
          instagram_url: string | null
          team_id: string
          tiktok_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string
          facebook_url?: string | null
          instagram_url?: string | null
          team_id: string
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string
          facebook_url?: string | null
          instagram_url?: string | null
          team_id?: string
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_public_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_squad_preset_commands: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          request_id: string
          result: Json
          team_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          request_id: string
          result: Json
          team_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          request_id?: string
          result?: Json
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_squad_preset_commands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_squad_presets: {
        Row: {
          badge_key: Database["public"]["Enums"]["internal_squad_badge_key"]
          color: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          team_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          sort_order: number
          team_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          badge_key?: Database["public"]["Enums"]["internal_squad_badge_key"]
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          team_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_squad_presets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_whatsapp_reminder_settings: {
        Row: {
          created_at: string
          first_offset_minutes: number
          second_offset_minutes: number
          team_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          first_offset_minutes?: number
          second_offset_minutes?: number
          team_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          first_offset_minutes?: number
          second_offset_minutes?: number
          team_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_whatsapp_reminder_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          default_sport_format: Database["public"]["Enums"]["sport_format"]
          id: string
          is_public: boolean
          logo_path: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_sport_format?: Database["public"]["Enums"]["sport_format"]
          id?: string
          is_public?: boolean
          logo_path?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_sport_format?: Database["public"]["Enums"]["sport_format"]
          id?: string
          is_public?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_device_sessions: {
        Row: {
          absolute_expires_at: string
          auth_session_id: string
          first_seen_at: string
          idle_expires_at: string
          last_seen_at: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          absolute_expires_at?: string
          auth_session_id: string
          first_seen_at?: string
          idle_expires_at?: string
          last_seen_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          absolute_expires_at?: string
          auth_session_id?: string
          first_seen_at?: string
          idle_expires_at?: string
          last_seen_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_athlete_directory: {
        Row: {
          display_name: string | null
          photo_path: string | null
          player_handle: string | null
          positions: Json | null
          registration_number: number | null
          shirt_number: number | null
          team_slug: string | null
        }
        Relationships: []
      }
      public_event_directory: {
        Row: {
          ends_at: string | null
          kind: Database["public"]["Enums"]["event_kind"] | null
          opponent_name: string | null
          public_id: string | null
          sport_format: Database["public"]["Enums"]["sport_format"] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          team_name: string | null
          team_timezone: string | null
          title: string | null
        }
        Relationships: []
      }
      public_match_directory: {
        Row: {
          event_id: string | null
          id: string | null
          ordinal: number | null
          public_id: string | null
          public_mode: Database["public"]["Enums"]["match_public_mode"] | null
          status: Database["public"]["Enums"]["match_status"] | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_matches_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      public_player_directory: {
        Row: {
          bio: string | null
          display_name: string | null
          handle: string | null
          photo_path: string | null
          positions: Json | null
          preferred_name: string | null
        }
        Relationships: []
      }
      public_team_directory: {
        Row: {
          about: string | null
          cover_path: string | null
          default_sport_format:
            | Database["public"]["Enums"]["sport_format"]
            | null
          facebook_url: string | null
          instagram_url: string | null
          logo_path: string | null
          name: string | null
          slug: string | null
          tiktok_url: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Relationships: []
      }
      public_team_media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string | null
          is_featured: boolean | null
          sort_order: number | null
          storage_path: string | null
          team_slug: string | null
        }
        Relationships: []
      }
      public_team_upcoming_events: {
        Row: {
          attendance_deadline: string | null
          ends_at: string | null
          event_id: string | null
          kind: Database["public"]["Enums"]["event_kind"] | null
          opponent_name: string | null
          sport_format: Database["public"]["Enums"]["sport_format"] | null
          starts_at: string | null
          team_slug: string | null
          team_timezone: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ack_notification_sent: {
        Args: {
          requested_attempt_id: string
          requested_lease_token: string
          requested_outbox_id: string
          requested_provider_message_id: string
        }
        Returns: boolean
      }
      add_match_incident_as_staff: {
        Args: {
          incident_assist_athlete_id?: string
          incident_athlete_id: string
          incident_kind: Database["public"]["Enums"]["match_incident_kind"]
          incident_minute?: number
          incident_notes?: string
          incident_scoring_side?: number
          requested_event_id: string
        }
        Returns: string
      }
      add_team_gallery_media: {
        Args: {
          requested_alt_text?: string
          requested_storage_path: string
          requested_team_id: string
        }
        Returns: string
      }
      cancel_event_as_staff: {
        Args: {
          cancel_scope: string
          request_id: string
          requested_event_id: string
          requested_team_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["event_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cast_craque_vote:
        | {
            Args: {
              requested_candidate_athlete_id: string
              requested_match_id: string
            }
            Returns: {
              receipt_expires_at: string
              receipt_token: string
              vote_id: string
            }[]
          }
        | {
            Args: {
              requested_candidate_athlete_id: string
              requested_match_id: string
              requested_receipt_hash: string
              requested_voter_hash: string
            }
            Returns: string
          }
      claim_notification_batch: {
        Args: { requested_lease_seconds?: number; requested_limit?: number }
        Returns: {
          attempt_number: number
          lease_token: string
          outbox_id: string
        }[]
      }
      claim_notification_for_sandbox_pilot: {
        Args: {
          requested_lease_seconds?: number
          requested_outbox_id: string
          requested_recipient: string
          requested_team_id: string
        }
        Returns: {
          attempt_number: number
          lease_token: string
          outbox_id: string
        }[]
      }
      cleanup_craque_voting_retention: {
        Args: { requested_limit?: number }
        Returns: Json
      }
      cleanup_match_conversation_retention: {
        Args: { requested_limit?: number }
        Returns: Json
      }
      complete_verified_athlete_registration: {
        Args: {
          accepts_privacy_terms: boolean
          accepts_whatsapp: boolean
          birth_date: string
          full_name: string
          position_codes: string[]
          preferred_name: string
          team_slug: string
        }
        Returns: string
      }
      create_athlete_as_staff: {
        Args: {
          athlete_birth_date?: string
          athlete_email?: string
          athlete_full_name: string
          athlete_phone_e164?: string
          athlete_preferred_name?: string
          athlete_public_profile?: boolean
          athlete_shirt_number?: number
          position_codes?: string[]
          requested_team_id: string
        }
        Returns: string
      }
      create_event_as_staff: {
        Args: {
          attendance_deadline_minutes: number
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_starts_at: string
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          repeat_weeks?: number
          requested_team_id: string
        }
        Returns: string
      }
      create_event_as_staff_v2: {
        Args: {
          attendance_deadline_minutes: number
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          repeat_weeks?: number
          request_id: string
          requested_team_id: string
          starts_at_local: string
        }
        Returns: Database["public"]["CompositeTypes"]["event_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_event_match: {
        Args: {
          requested_event_id: string
          requested_external_opponent_name?: string
          requested_ordinal?: number
          requested_side_a_label?: string
          requested_side_b_label?: string
        }
        Returns: string
      }
      create_match_comment: {
        Args: {
          requested_body: string
          requested_idempotency_key: string
          requested_match_id: string
          requested_parent_comment_id?: string
        }
        Returns: string
      }
      create_team_for_current_user: {
        Args: {
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_name: string
          team_slug: string
        }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          invited_email: string
          invited_role: Database["public"]["Enums"]["team_role"]
          requested_team_id: string
        }
        Returns: {
          invitation_expires_at: string
          invitation_id: string
          invite_token: string
        }[]
      }
      delete_match_incident_as_staff: {
        Args: { requested_incident_id: string }
        Returns: boolean
      }
      delete_my_match_comment: {
        Args: { requested_comment_id: string }
        Returns: boolean
      }
      delivery_foundation_probe: {
        Args: {
          requested_feature: Database["public"]["Enums"]["feature_key"]
          requested_team_id: string
        }
        Returns: boolean
      }
      enqueue_event_whatsapp_call: {
        Args: {
          requested_event_id: string
          requested_template_key: string
          requested_template_version?: string
        }
        Returns: {
          athlete_id: string
          inserted: boolean
          outbox_id: string
        }[]
      }
      enqueue_next_event_whatsapp_reminder: {
        Args: { request_id: string; requested_event_id: string }
        Returns: Database["public"]["CompositeTypes"]["event_whatsapp_reminder_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_whatsapp_reminder_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      exchange_event_access_credential: {
        Args: {
          requested_credential_secret: string
          requested_public_id: string
        }
        Returns: {
          capability_expires_at: string
          capability_secret: string
        }[]
      }
      extend_event_series_as_staff: {
        Args: {
          additional_occurrences: number
          request_id: string
          requested_series_id: string
          requested_team_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["event_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_event_match: {
        Args: { requested_match_id: string }
        Returns: undefined
      }
      get_craque_vote_result: {
        Args: { requested_match_id: string }
        Returns: {
          candidate_athlete_id: string
          vote_count: number
          vote_percentage: number
        }[]
      }
      get_event_capability_pilot_health: {
        Args: { requested_team_id: string }
        Returns: {
          active_capability_sessions: number
          active_credentials: number
          capability_sessions_created_24h: number
          capability_sessions_revoked_24h: number
          global_exchange_enabled: boolean
          last_exchange_at: string
          last_rsvp_at: string
          observed_at: string
          rsvp_writes_24h: number
          team_exchange_enabled: boolean
          team_rsvp_enabled: boolean
        }[]
      }
      get_event_lineup_pilot_health: {
        Args: { requested_team_id: string }
        Returns: {
          active_revisions: number
          consented_published_assignments: number
          draft_assignments: number
          draft_events: number
          draft_exclusions: number
          draft_squads: number
          last_draft_at: string
          last_publication_at: string
          last_withdrawal_at: string
          observed_at: string
          public_event_page_enabled: boolean
          publications_24h: number
          published_assignments: number
          published_squads: number
          scheduled_events: number
          team_division_enabled: boolean
          withdrawals_24h: number
        }[]
      }
      get_event_share_card_pilot_health: {
        Args: { requested_team_id: string }
        Returns: {
          call_events: number
          cancelled_events: number
          completed_events: number
          event_matches_enabled: boolean
          event_share_card_enabled: boolean
          fallback_events: number
          last_flag_change_at: string
          lineup_events: number
          live_events: number
          observed_at: string
          projected_events: number
          public_event_page_enabled: boolean
          result_events: number
          score_events: number
          voting_enabled: boolean
          voting_events: number
          window_events: number
        }[]
      }
      get_event_whatsapp_reminder_state: {
        Args: { requested_event_id: string }
        Returns: {
          consumed_at: string
          cost_amount: number
          cost_kind: string
          eligible_count: number
          failed_count: number
          outbox_count: number
          pending_count: number
          scheduled_for: string
          sent_count: number
          slot_id: string
          slot_key: Database["public"]["Enums"]["event_reminder_slot_key"]
          status: Database["public"]["Enums"]["event_reminder_slot_status"]
          template_version: string
          triggered_manually: boolean
        }[]
      }
      get_match_conversation: {
        Args: { requested_match_id: string }
        Returns: {
          author_display_name: string
          body: string
          can_delete: boolean
          comment_id: string
          created_at: string
          parent_comment_id: string
          status: Database["public"]["Enums"]["match_comment_status"]
        }[]
      }
      get_match_conversation_moderation: {
        Args: { requested_event_id: string }
        Returns: {
          author_display_name: string
          body: string
          comment_id: string
          created_at: string
          match_id: string
          match_ordinal: number
          moderation_reason: string
          parent_comment_id: string
          report_count: number
          report_reasons: string[]
          status: Database["public"]["Enums"]["match_comment_status"]
        }[]
      }
      get_match_conversation_state: {
        Args: { requested_match_id: string }
        Returns: {
          accessible: boolean
          closes_at: string
          writable: boolean
        }[]
      }
      get_my_craque_vote_status: {
        Args: { requested_match_id: string }
        Returns: {
          already_voted: boolean
          eligible: boolean
          voting_closes_at: string
        }[]
      }
      get_my_player_statistics: {
        Args: never
        Returns: {
          assists: number
          goals: number
          matches_played: number
          red_cards: number
          yellow_cards: number
        }[]
      }
      get_public_event_lineup: {
        Args: { requested_public_id: string }
        Returns: Json
      }
      get_public_event_share_state: {
        Args: { requested_public_id: string }
        Returns: Json
      }
      get_public_player_statistics: {
        Args: { requested_handle: string }
        Returns: {
          assists: number
          goals: number
          matches_played: number
          red_cards: number
          yellow_cards: number
        }[]
      }
      get_team_invitation_preview: {
        Args: { raw_token: string }
        Returns: {
          invitation_expires_at: string
          invited_role: Database["public"]["Enums"]["team_role"]
          team_name: string
          team_slug: string
        }[]
      }
      is_runtime_control_enabled: {
        Args: {
          requested_control: Database["public"]["Enums"]["runtime_control_key"]
        }
        Returns: boolean
      }
      is_team_feature_enabled: {
        Args: {
          requested_feature: Database["public"]["Enums"]["feature_key"]
          requested_team_id: string
        }
        Returns: boolean
      }
      issue_event_access_credential: {
        Args: { requested_athlete_id: string; requested_event_id: string }
        Returns: {
          credential_id: string
          credential_secret: string
          expires_at: string
          public_id: string
        }[]
      }
      link_event_lineup_squad_to_match_side: {
        Args: {
          request_id: string
          requested_match_id: string
          requested_side_index: number
          requested_squad_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["event_lineup_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_lineup_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_my_player_team_links: {
        Args: never
        Returns: {
          athlete_id: string
          athlete_status: Database["public"]["Enums"]["athlete_status"]
          registration_number: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          team_name: string
          team_slug: string
          team_timezone: string
        }[]
      }
      list_my_team_invitations: {
        Args: never
        Returns: {
          invitation_created_at: string
          invitation_expires_at: string
          invitation_id: string
          invited_by_name: string
          invited_role: Database["public"]["Enums"]["team_role"]
          team_name: string
          team_slug: string
        }[]
      }
      list_whatsapp_delivery_operation: {
        Args: { requested_limit?: number; requested_team_id: string }
        Returns: {
          athlete_id: string
          attempts: number
          created_at: string
          delivery_status: string
          event_id: string
          failure_class: string
          outbox_id: string
          outbox_status: Database["public"]["Enums"]["message_status"]
          provider_error_code: string
          requires_review: boolean
          updated_at: string
        }[]
      }
      moderate_match_comment: {
        Args: { requested_comment_id: string; requested_reason: string }
        Returns: boolean
      }
      nack_notification: {
        Args: {
          requested_attempt_id: string
          requested_error_code: string
          requested_failure_class: string
          requested_lease_token: string
          requested_outbox_id: string
        }
        Returns: boolean
      }
      prepare_whatsapp_dispatch: {
        Args: { requested_lease_token: string; requested_outbox_id: string }
        Returns: {
          attempt_id: string
          callback_token: string
          credential_secret: string
          event_public_id: string
          recipient: string
          template_key: string
          template_payload: Json
          template_version: string
        }[]
      }
      produce_due_event_whatsapp_reminders: {
        Args: { requested_limit?: number }
        Returns: {
          empty_slots: number
          enqueued_messages: number
          enqueued_slots: number
          scanned_slots: number
          skipped_slots: number
        }[]
      }
      publish_event_lineup: {
        Args: { request_id: string; requested_event_id: string }
        Returns: Database["public"]["CompositeTypes"]["event_lineup_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_lineup_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_match_event: {
        Args: {
          requested_assist_athlete_id?: string
          requested_athlete_id?: string
          requested_delta?: number
          requested_kind: Database["public"]["Enums"]["match_event_kind"]
          requested_match_id: string
          requested_minute?: number
          requested_notes?: string
          requested_side_index: number
        }
        Returns: string
      }
      record_notification_callback: {
        Args: {
          requested_callback_token: string
          requested_delivery_status: string
          requested_error_code?: string
          requested_provider_message_id: string
        }
        Returns: boolean
      }
      record_notification_callback_by_attempt_id: {
        Args: {
          requested_attempt_id: string
          requested_delivery_status: string
          requested_error_code?: string
          requested_provider_message_id: string
        }
        Returns: boolean
      }
      recover_expired_notification_leases: {
        Args: never
        Returns: {
          review_count: number
          safe_retry_count: number
        }[]
      }
      register_or_touch_verified_device_session: {
        Args: never
        Returns: {
          absolute_expires_at: string
          auth_session_id: string
          idle_expires_at: string
        }[]
      }
      release_notification_claim: {
        Args: { requested_lease_token: string; requested_outbox_id: string }
        Returns: boolean
      }
      remove_athlete_from_team: {
        Args: { requested_athlete_id: string }
        Returns: {
          removal_outcome: string
          removed_photo_path: string
        }[]
      }
      remove_my_player_photo: { Args: never; Returns: string }
      remove_team_media: {
        Args: { requested_media_id: string }
        Returns: string
      }
      replace_my_player_photo: {
        Args: { requested_storage_path: string }
        Returns: string
      }
      replace_team_identity_media: {
        Args: {
          requested_alt_text?: string
          requested_kind: string
          requested_storage_path: string
          requested_team_id: string
        }
        Returns: string
      }
      replace_team_squad_presets: {
        Args: {
          request_id: string
          requested_presets: Json
          requested_team_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["team_squad_preset_command_result"]
        SetofOptions: {
          from: "*"
          to: "team_squad_preset_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_match_comment: {
        Args: { requested_comment_id: string; requested_reason: string }
        Returns: string
      }
      resolve_event_access_for_verified_session: {
        Args: { requested_public_id: string }
        Returns: {
          athlete_display_name: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          can_respond: boolean
          capability_expires_at: string
          event_status: Database["public"]["Enums"]["event_status"]
          public_id: string
        }[]
      }
      resolve_event_capability: {
        Args: {
          requested_capability_secret: string
          requested_public_id: string
        }
        Returns: {
          athlete_display_name: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          can_respond: boolean
          capability_expires_at: string
          event_status: Database["public"]["Enums"]["event_status"]
          public_id: string
        }[]
      }
      respond_to_event_as_player: {
        Args: {
          requested_event_id: string
          response_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      respond_to_event_from_access: {
        Args: {
          requested_capability_secret?: string
          requested_public_id: string
          response_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      respond_to_team_invitation: {
        Args: { invitation_response: string; requested_invitation_id: string }
        Returns: string
      }
      restore_match_comment: {
        Args: { requested_comment_id: string; requested_reason: string }
        Returns: boolean
      }
      review_athlete_registration: {
        Args: { decision: string; requested_athlete_id: string }
        Returns: Database["public"]["Enums"]["athlete_status"]
      }
      revoke_all_my_verified_device_sessions: {
        Args: { requested_reason?: string }
        Returns: number
      }
      revoke_event_access_credential: {
        Args: { requested_credential_id: string; requested_reason?: string }
        Returns: boolean
      }
      revoke_team_invitation: {
        Args: { requested_invitation_id: string }
        Returns: boolean
      }
      revoke_verified_device_session: {
        Args: { requested_reason?: string; requested_session_id: string }
        Returns: boolean
      }
      save_event_lineup_draft: {
        Args: {
          request_id: string
          requested_assignments: Json
          requested_event_id: string
          requested_exclusions?: string[]
          requested_squads: Json
        }
        Returns: Database["public"]["CompositeTypes"]["event_lineup_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_lineup_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_match_report_as_staff: {
        Args: {
          requested_event_id: string
          requested_notes?: string
          requested_side_a_label: string
          requested_side_a_score: number
          requested_side_b_label: string
          requested_side_b_score: number
          should_finalize?: boolean
        }
        Returns: string
      }
      set_athlete_availability: {
        Args: {
          next_status: Database["public"]["Enums"]["athlete_status"]
          requested_athlete_id: string
        }
        Returns: Database["public"]["Enums"]["athlete_status"]
      }
      set_event_attendance_as_staff: {
        Args: {
          next_status: Database["public"]["Enums"]["attendance_status"]
          requested_athlete_id: string
          requested_event_id: string
        }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      set_event_whatsapp_reminder_override: {
        Args: {
          requested_event_id: string
          requested_first_offset_minutes?: number
          requested_second_offset_minutes?: number
          requested_team_id: string
        }
        Returns: {
          configured_by: string
          created_at: string
          event_id: string
          first_offset_minutes: number
          is_override: boolean
          second_offset_minutes: number
          team_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "event_whatsapp_reminder_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_match_participation: {
        Args: {
          requested_athlete_id: string
          requested_match_id: string
          requested_side_index: number
        }
        Returns: string
      }
      set_match_public_mode: {
        Args: {
          requested_match_id: string
          requested_mode: Database["public"]["Enums"]["match_public_mode"]
        }
        Returns: undefined
      }
      set_public_sports_activity_consent: {
        Args: {
          request_id: string
          requested_athlete_id: string
          requested_granted: boolean
          requested_terms_version: string
        }
        Returns: {
          athlete_id: string
          created_at: string
          evidence: string
          granted_at: string | null
          purpose: Database["public"]["Enums"]["athlete_public_consent_purpose"]
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          terms_version: string
          updated_at: string
          updated_by: string
        }
        SetofOptions: {
          from: "*"
          to: "athlete_public_consents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_runtime_control: {
        Args: {
          requested_control: Database["public"]["Enums"]["runtime_control_key"]
          requested_enabled: boolean
        }
        Returns: {
          control: Database["public"]["Enums"]["runtime_control_key"]
          enabled: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "runtime_controls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_team_feature_flag: {
        Args: {
          requested_enabled: boolean
          requested_feature: Database["public"]["Enums"]["feature_key"]
          requested_team_id: string
        }
        Returns: {
          created_at: string
          enabled: boolean
          feature: Database["public"]["Enums"]["feature_key"]
          team_id: string
          updated_at: string
          updated_by: string
        }
        SetofOptions: {
          from: "*"
          to: "team_feature_flags"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_team_featured_media: {
        Args: { requested_media_id: string }
        Returns: boolean
      }
      set_team_whatsapp_reminder_settings: {
        Args: {
          requested_first_offset_minutes: number
          requested_second_offset_minutes: number
          requested_team_id: string
        }
        Returns: {
          created_at: string
          first_offset_minutes: number
          second_offset_minutes: number
          team_id: string
          updated_at: string
          updated_by: string
        }
        SetofOptions: {
          from: "*"
          to: "team_whatsapp_reminder_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_athlete_registration: {
        Args: {
          accepts_privacy_terms?: boolean
          accepts_whatsapp?: boolean
          birth_date?: string
          email?: string
          full_name: string
          phone_e164?: string
          preferred_name?: string
          team_slug: string
        }
        Returns: boolean
      }
      update_athlete_as_admin: {
        Args: {
          athlete_birth_date?: string
          athlete_email?: string
          athlete_full_name?: string
          athlete_phone_e164?: string
          athlete_preferred_name?: string
          athlete_public_profile?: boolean
          athlete_shirt_number?: number
          position_codes?: string[]
          requested_athlete_id: string
          team_notes?: string
        }
        Returns: boolean
      }
      update_event_as_staff: {
        Args: {
          attendance_deadline_minutes: number
          edit_scope: string
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_starts_at: string
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          requested_event_id: string
          requested_team_id: string
        }
        Returns: number
      }
      update_event_as_staff_v2: {
        Args: {
          attendance_deadline_minutes: number
          edit_scope: string
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          request_id: string
          requested_event_id: string
          requested_team_id: string
          starts_at_local: string
        }
        Returns: Database["public"]["CompositeTypes"]["event_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_player_profile: {
        Args: {
          field_positions: string[]
          futsal_positions: string[]
          requested_bio: string
          requested_display_name: string
          requested_handle: string
          requested_is_public: boolean
          requested_preferred_name: string
          society_positions: string[]
        }
        Returns: string
      }
      update_team_social_settings: {
        Args: {
          requested_about: string
          requested_facebook_url: string
          requested_instagram_url: string
          requested_is_public: boolean
          requested_name: string
          requested_slug: string
          requested_sport_format: Database["public"]["Enums"]["sport_format"]
          requested_team_id: string
          requested_tiktok_url: string
          requested_timezone: string
          requested_website_url: string
          requested_youtube_url: string
        }
        Returns: boolean
      }
      verify_craque_vote_receipt: {
        Args: { requested_receipt_token: string }
        Returns: boolean
      }
      void_event_match: {
        Args: { requested_match_id: string; requested_reason: string }
        Returns: undefined
      }
      withdraw_event_lineup_publication: {
        Args: { request_id: string; requested_event_id: string }
        Returns: Database["public"]["CompositeTypes"]["event_lineup_command_result"]
        SetofOptions: {
          from: "*"
          to: "event_lineup_command_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      athlete_public_consent_purpose:
        | "public_player_profile"
        | "public_sports_activity"
      athlete_status: "pending" | "active" | "inactive" | "rejected"
      attendance_source: "web" | "admin" | "whatsapp"
      attendance_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "maybe"
        | "waitlist"
      consent_status: "granted" | "revoked"
      craque_vote_status: "counted" | "revoked"
      event_change_kind:
        | "created"
        | "details_updated"
        | "rescheduled"
        | "cancelled"
        | "series_extended"
      event_command_kind: "create" | "update" | "cancel" | "extend_series"
      event_kind:
        | "weekly_match"
        | "championship"
        | "friendly"
        | "tournament"
        | "training"
        | "other"
      event_lineup_command_kind:
        | "save_draft"
        | "publish"
        | "withdraw"
        | "link_match"
      event_reminder_slot_key: "reminder_1" | "reminder_2"
      event_reminder_slot_status:
        | "scheduled"
        | "processing"
        | "enqueued"
        | "skipped"
        | "cancelled"
      event_status: "scheduled" | "cancelled" | "completed"
      feature_key:
        | "persistent_event_access"
        | "whatsapp_delivery"
        | "post_match"
        | "voting"
        | "comments"
        | "team_division"
        | "event_control"
        | "public_event_page"
        | "event_capability_exchange"
        | "event_capability_rsvp"
        | "event_matches"
        | "whatsapp_reminders"
        | "event_share_card"
      internal_squad_badge_key:
        | "shield"
        | "stripes"
        | "sash"
        | "quarters"
        | "circle"
        | "diamond"
      lineup_slot_kind: "starter" | "substitute"
      match_comment_report_status: "open" | "resolved" | "dismissed"
      match_comment_status: "active" | "author_deleted" | "moderated"
      match_event_kind:
        | "goal"
        | "own_goal"
        | "yellow_card"
        | "red_card"
        | "substitution"
        | "score_adjustment"
        | "note"
      match_incident_kind: "goal" | "yellow_card" | "red_card"
      match_public_mode: "private" | "final_result" | "live"
      match_status: "scheduled" | "live" | "finalized" | "void"
      membership_status: "invited" | "active" | "suspended"
      message_channel: "whatsapp" | "email" | "push"
      message_status: "pending" | "processing" | "sent" | "failed" | "cancelled"
      organization_mode: "single_squad" | "split_teams"
      registration_source: "admin" | "public_form" | "import"
      runtime_control_key:
        | "integration_produce"
        | "integration_consume"
        | "event_capability_exchange"
      sport_format: "field" | "society" | "futsal"
      team_invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "revoked"
        | "expired"
      team_role: "owner" | "admin" | "manager"
    }
    CompositeTypes: {
      event_command_result: {
        request_id: string | null
        event_id: string | null
        series_id: string | null
        affected_count: number | null
        max_schedule_version: number | null
        replayed: boolean | null
      }
      event_lineup_command_result: {
        request_id: string | null
        event_id: string | null
        revision_id: string | null
        squad_count: number | null
        assigned_count: number | null
        excluded_count: number | null
        replayed: boolean | null
      }
      event_whatsapp_reminder_command_result: {
        request_id: string | null
        slot_id: string | null
        slot_key: Database["public"]["Enums"]["event_reminder_slot_key"] | null
        eligible_count: number | null
        inserted_count: number | null
        replayed: boolean | null
      }
      team_squad_preset_command_result: {
        request_id: string | null
        preset_count: number | null
        replayed: boolean | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      athlete_public_consent_purpose: [
        "public_player_profile",
        "public_sports_activity",
      ],
      athlete_status: ["pending", "active", "inactive", "rejected"],
      attendance_source: ["web", "admin", "whatsapp"],
      attendance_status: [
        "pending",
        "confirmed",
        "declined",
        "maybe",
        "waitlist",
      ],
      consent_status: ["granted", "revoked"],
      craque_vote_status: ["counted", "revoked"],
      event_change_kind: [
        "created",
        "details_updated",
        "rescheduled",
        "cancelled",
        "series_extended",
      ],
      event_command_kind: ["create", "update", "cancel", "extend_series"],
      event_kind: [
        "weekly_match",
        "championship",
        "friendly",
        "tournament",
        "training",
        "other",
      ],
      event_lineup_command_kind: [
        "save_draft",
        "publish",
        "withdraw",
        "link_match",
      ],
      event_reminder_slot_key: ["reminder_1", "reminder_2"],
      event_reminder_slot_status: [
        "scheduled",
        "processing",
        "enqueued",
        "skipped",
        "cancelled",
      ],
      event_status: ["scheduled", "cancelled", "completed"],
      feature_key: [
        "persistent_event_access",
        "whatsapp_delivery",
        "post_match",
        "voting",
        "comments",
        "team_division",
        "event_control",
        "public_event_page",
        "event_capability_exchange",
        "event_capability_rsvp",
        "event_matches",
        "whatsapp_reminders",
        "event_share_card",
      ],
      internal_squad_badge_key: [
        "shield",
        "stripes",
        "sash",
        "quarters",
        "circle",
        "diamond",
      ],
      lineup_slot_kind: ["starter", "substitute"],
      match_comment_report_status: ["open", "resolved", "dismissed"],
      match_comment_status: ["active", "author_deleted", "moderated"],
      match_event_kind: [
        "goal",
        "own_goal",
        "yellow_card",
        "red_card",
        "substitution",
        "score_adjustment",
        "note",
      ],
      match_incident_kind: ["goal", "yellow_card", "red_card"],
      match_public_mode: ["private", "final_result", "live"],
      match_status: ["scheduled", "live", "finalized", "void"],
      membership_status: ["invited", "active", "suspended"],
      message_channel: ["whatsapp", "email", "push"],
      message_status: ["pending", "processing", "sent", "failed", "cancelled"],
      organization_mode: ["single_squad", "split_teams"],
      registration_source: ["admin", "public_form", "import"],
      runtime_control_key: [
        "integration_produce",
        "integration_consume",
        "event_capability_exchange",
      ],
      sport_format: ["field", "society", "futsal"],
      team_invitation_status: [
        "pending",
        "accepted",
        "declined",
        "revoked",
        "expired",
      ],
      team_role: ["owner", "admin", "manager"],
    },
  },
} as const

