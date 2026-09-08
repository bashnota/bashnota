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
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          source_created_at_raw: string | null
          source_updated_at_raw: string | null
          updated_at: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          comment_id: string
          created_at?: string
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          comment_id?: string
          created_at?: string
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "public_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          author_name: string
          author_tag: string | null
          content: Json
          created_at: string
          dislike_count: number
          id: string
          legacy_author_uid: string | null
          like_count: number
          nota_id: string
          parent_id: string | null
          reply_count: number
          source_created_at_raw: string | null
          source_updated_at_raw: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          author_tag?: string | null
          content: Json
          created_at?: string
          dislike_count?: number
          id: string
          legacy_author_uid?: string | null
          like_count?: number
          nota_id: string
          parent_id?: string | null
          reply_count?: number
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_tag?: string | null
          content?: Json
          created_at?: string
          dislike_count?: number
          id?: string
          legacy_author_uid?: string | null
          like_count?: number
          nota_id?: string
          parent_id?: string | null
          reply_count?: number
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_identity_fk"
            columns: ["legacy_author_uid", "author_id"]
            isOneToOne: false
            referencedRelation: "identity_map"
            referencedColumns: ["firebase_uid", "supabase_user_id"]
          },
          {
            foreignKeyName: "comments_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_map: {
        Row: {
          firebase_uid: string
          migrated_at: string
          provider_links: Json
          source_hash: string
          supabase_user_id: string
        }
        Insert: {
          firebase_uid: string
          migrated_at?: string
          provider_links?: Json
          source_hash: string
          supabase_user_id: string
        }
        Update: {
          firebase_uid?: string
          migrated_at?: string
          provider_links?: Json
          source_hash?: string
          supabase_user_id?: string
        }
        Relationships: []
      }
      legacy_identity_provisioning: {
        Row: {
          created_at: string
          provider: string
          provider_uid: string
          source_uid: string
          state: string
          supabase_user_id: string
          verified_email_hash: string
        }
        Insert: {
          created_at?: string
          provider: string
          provider_uid: string
          source_uid: string
          state: string
          supabase_user_id: string
          verified_email_hash: string
        }
        Update: {
          created_at?: string
          provider?: string
          provider_uid?: string
          source_uid?: string
          state?: string
          supabase_user_id?: string
          verified_email_hash?: string
        }
        Relationships: []
      }
      legacy_migration_audit: {
        Row: {
          created_at: string
          event: Json
          event_hash: string
          idempotency_key: string
          previous_hash: string | null
          run_id: string
          sequence: number
        }
        Insert: {
          created_at?: string
          event: Json
          event_hash: string
          idempotency_key: string
          previous_hash?: string | null
          run_id: string
          sequence: number
        }
        Update: {
          created_at?: string
          event?: Json
          event_hash?: string
          idempotency_key?: string
          previous_hash?: string | null
          run_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "legacy_migration_audit_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "legacy_migration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_migration_journal: {
        Row: {
          applied_at: string | null
          applied_by_run_id: string | null
          attempt_count: number
          entity_kind: string
          error_class: string | null
          first_run_id: string
          mutation_kind: string | null
          prior_row_hash: string | null
          sequence: number
          source_hash: string
          source_key_hash: string
          state: string
          target_hash: string
          target_key: Json
        }
        Insert: {
          applied_at?: string | null
          applied_by_run_id?: string | null
          attempt_count?: number
          entity_kind: string
          error_class?: string | null
          first_run_id: string
          mutation_kind?: string | null
          prior_row_hash?: string | null
          sequence: number
          source_hash: string
          source_key_hash: string
          state: string
          target_hash: string
          target_key: Json
        }
        Update: {
          applied_at?: string | null
          applied_by_run_id?: string | null
          attempt_count?: number
          entity_kind?: string
          error_class?: string | null
          first_run_id?: string
          mutation_kind?: string | null
          prior_row_hash?: string | null
          sequence?: number
          source_hash?: string
          source_key_hash?: string
          state?: string
          target_hash?: string
          target_key?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legacy_migration_journal_applied_by_run_id_fkey"
            columns: ["applied_by_run_id"]
            isOneToOne: false
            referencedRelation: "legacy_migration_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_migration_journal_first_run_id_fkey"
            columns: ["first_run_id"]
            isOneToOne: false
            referencedRelation: "legacy_migration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_migration_runs: {
        Row: {
          checkpoint_sequence: number
          completed_at: string | null
          counters: Json
          dry_run: boolean
          id: string
          identity_plan_hash: string
          lease_expires_at: string | null
          lease_owner_hash: string | null
          manifest_hash: string
          source_watermark: string
          started_at: string
          state: string
          tool_version: string
        }
        Insert: {
          checkpoint_sequence?: number
          completed_at?: string | null
          counters?: Json
          dry_run?: boolean
          id: string
          identity_plan_hash: string
          lease_expires_at?: string | null
          lease_owner_hash?: string | null
          manifest_hash: string
          source_watermark: string
          started_at?: string
          state: string
          tool_version: string
        }
        Update: {
          checkpoint_sequence?: number
          completed_at?: string | null
          counters?: Json
          dry_run?: boolean
          id?: string
          identity_plan_hash?: string
          lease_expires_at?: string | null
          lease_owner_hash?: string | null
          manifest_hash?: string
          source_watermark?: string
          started_at?: string
          state?: string
          tool_version?: string
        }
        Relationships: []
      }
      legacy_notas: {
        Row: {
          id: string
          imported_at: string
          legacy_owner_uid: string
          payload: Json
          source_hash: string
        }
        Insert: {
          id: string
          imported_at?: string
          legacy_owner_uid: string
          payload: Json
          source_hash: string
        }
        Update: {
          id?: string
          imported_at?: string
          legacy_owner_uid?: string
          payload?: Json
          source_hash?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          display_name: string | null
          email: string
          firebase_uid: string | null
          source_subscribed_at_raw: string | null
          subscribed_at: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          email: string
          firebase_uid?: string | null
          source_subscribed_at_raw?: string | null
          subscribed_at?: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          email?: string
          firebase_uid?: string | null
          source_subscribed_at_raw?: string | null
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_identity_fk"
            columns: ["firebase_uid", "user_id"]
            isOneToOne: false
            referencedRelation: "identity_map"
            referencedColumns: ["firebase_uid", "supabase_user_id"]
          },
        ]
      }
      nota_view_aggregates: {
        Row: {
          bucket_key: string
          bucket_kind: string
          nota_id: string
          view_count: number
        }
        Insert: {
          bucket_key: string
          bucket_kind: string
          nota_id: string
          view_count?: number
        }
        Update: {
          bucket_key?: string
          bucket_kind?: string
          nota_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "nota_view_aggregates_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_view_aggregates_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_view_events: {
        Row: {
          id: string
          nota_id: string
          occurred_at: string
          referrer_key: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          nota_id: string
          occurred_at?: string
          referrer_key?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          nota_id?: string
          occurred_at?: string
          referrer_key?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_view_events_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_view_events_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_viewers: {
        Row: {
          first_viewed_at: string
          nota_id: string
          source_first_viewed_at_raw: string | null
          user_id: string
        }
        Insert: {
          first_viewed_at?: string
          nota_id: string
          source_first_viewed_at_raw?: string | null
          user_id: string
        }
        Update: {
          first_viewed_at?: string
          nota_id?: string
          source_first_viewed_at_raw?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nota_viewers_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_viewers_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_votes: {
        Row: {
          created_at: string
          nota_id: string
          source_created_at_raw: string | null
          source_updated_at_raw: string | null
          updated_at: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          nota_id: string
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          nota_id?: string
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "nota_votes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_votes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      private_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          firebase_uid: string | null
          source_created_at_raw: string | null
          source_updated_at_raw: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          firebase_uid?: string | null
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          firebase_uid?: string | null
          source_created_at_raw?: string | null
          source_updated_at_raw?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_profiles_identity_fk"
            columns: ["firebase_uid", "user_id"]
            isOneToOne: false
            referencedRelation: "identity_map"
            referencedColumns: ["firebase_uid", "supabase_user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        Insert: {
          display_name?: string
          photo_url?: string
          updated_at?: string
          user_id: string
          user_tag: string
        }
        Update: {
          display_name?: string
          photo_url?: string
          updated_at?: string
          user_id?: string
          user_tag?: string
        }
        Relationships: []
      }
      published_image_assets: {
        Row: {
          byte_size: number
          created_at: string
          deleting_at: string | null
          height: number
          mime_type: string
          owner_id: string
          path: string
          width: number
        }
        Insert: {
          byte_size: number
          created_at?: string
          deleting_at?: string | null
          height: number
          mime_type: string
          owner_id: string
          path: string
          width: number
        }
        Update: {
          byte_size?: number
          created_at?: string
          deleting_at?: string | null
          height?: number
          mime_type?: string
          owner_id?: string
          path?: string
          width?: number
        }
        Relationships: []
      }
      published_image_references: {
        Row: {
          nota_id: string
          path: string
        }
        Insert: {
          nota_id: string
          path: string
        }
        Update: {
          nota_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_image_references_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_image_references_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_image_references_path_fkey"
            columns: ["path"]
            isOneToOne: false
            referencedRelation: "published_image_assets"
            referencedColumns: ["path"]
          },
        ]
      }
      published_nota_edges: {
        Row: {
          child_id: string
          ordinal: number
          parent_id: string
        }
        Insert: {
          child_id: string
          ordinal: number
          parent_id: string
        }
        Update: {
          child_id?: string
          ordinal?: number
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_nota_edges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_nota_edges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_nota_edges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_nota_edges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      published_notas: {
        Row: {
          author_id: string
          author_name: string
          clone_count: number
          comment_count: number
          content: Json | null
          content_quarantine_text: string | null
          dislike_count: number
          id: string
          is_public: boolean
          is_sub_page: boolean
          last_viewed_at: string | null
          legacy_author_uid: string | null
          like_count: number
          parent_id: string | null
          published_at: string
          published_nota_citations: Json
          source_last_viewed_at_raw: string | null
          source_published_at_raw: string | null
          source_updated_at_raw: string | null
          tags: string[]
          title: string
          unique_viewers: number
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          author_name?: string
          clone_count?: number
          comment_count?: number
          content?: Json | null
          content_quarantine_text?: string | null
          dislike_count?: number
          id: string
          is_public?: boolean
          is_sub_page?: boolean
          last_viewed_at?: string | null
          legacy_author_uid?: string | null
          like_count?: number
          parent_id?: string | null
          published_at: string
          published_nota_citations?: Json
          source_last_viewed_at_raw?: string | null
          source_published_at_raw?: string | null
          source_updated_at_raw?: string | null
          tags?: string[]
          title: string
          unique_viewers?: number
          updated_at: string
          view_count?: number
        }
        Update: {
          author_id?: string
          author_name?: string
          clone_count?: number
          comment_count?: number
          content?: Json | null
          content_quarantine_text?: string | null
          dislike_count?: number
          id?: string
          is_public?: boolean
          is_sub_page?: boolean
          last_viewed_at?: string | null
          legacy_author_uid?: string | null
          like_count?: number
          parent_id?: string | null
          published_at?: string
          published_nota_citations?: Json
          source_last_viewed_at_raw?: string | null
          source_published_at_raw?: string | null
          source_updated_at_raw?: string | null
          tags?: string[]
          title?: string
          unique_viewers?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "published_notas_identity_fk"
            columns: ["legacy_author_uid", "author_id"]
            isOneToOne: false
            referencedRelation: "identity_map"
            referencedColumns: ["firebase_uid", "supabase_user_id"]
          },
          {
            foreignKeyName: "published_notas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_notas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_deployment_state: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          migration_evidence_sha256: string | null
          production_cutover: boolean
          public_config_sha256: string | null
          reconciliation_evidence_sha256: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          migration_evidence_sha256?: string | null
          production_cutover?: boolean
          public_config_sha256?: string | null
          reconciliation_evidence_sha256?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          migration_evidence_sha256?: string | null
          production_cutover?: boolean
          public_config_sha256?: string | null
          reconciliation_evidence_sha256?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_tags: {
        Row: {
          created_at: string
          user_id: string
          user_tag: string
        }
        Insert: {
          created_at?: string
          user_id: string
          user_tag: string
        }
        Update: {
          created_at?: string
          user_id?: string
          user_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tags_profile_fk"
            columns: ["user_tag", "user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_tag", "user_id"]
          },
          {
            foreignKeyName: "user_tags_profile_fk"
            columns: ["user_tag", "user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["user_tag", "user_id"]
          },
          {
            foreignKeyName: "user_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      public_comments: {
        Row: {
          author_name: string | null
          author_tag: string | null
          content: Json | null
          created_at: string | null
          dislike_count: number | null
          id: string | null
          like_count: number | null
          nota_id: string | null
          parent_id: string | null
          reply_count: number | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          author_tag?: string | null
          content?: Json | null
          created_at?: string | null
          dislike_count?: number | null
          id?: string | null
          like_count?: number | null
          nota_id?: string | null
          parent_id?: string | null
          reply_count?: number | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          author_tag?: string | null
          content?: Json | null
          created_at?: string | null
          dislike_count?: number | null
          id?: string | null
          like_count?: number | null
          nota_id?: string | null
          parent_id?: string | null
          reply_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          display_name: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string | null
          user_tag: string | null
        }
        Insert: {
          display_name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_tag?: string | null
        }
        Update: {
          display_name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_tag?: string | null
        }
        Relationships: []
      }
      public_published_notas: {
        Row: {
          author_name: string | null
          clone_count: number | null
          comment_count: number | null
          content: Json | null
          dislike_count: number | null
          id: string | null
          is_sub_page: boolean | null
          last_viewed_at: string | null
          like_count: number | null
          parent_id: string | null
          published_at: string | null
          published_nota_citations: Json | null
          tags: string[] | null
          title: string | null
          unique_viewers: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_name?: string | null
          clone_count?: number | null
          comment_count?: number | null
          content?: Json | null
          dislike_count?: number | null
          id?: string | null
          is_sub_page?: boolean | null
          last_viewed_at?: string | null
          like_count?: number | null
          parent_id?: string | null
          published_at?: string | null
          published_nota_citations?: Json | null
          tags?: string[] | null
          title?: string | null
          unique_viewers?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_name?: string | null
          clone_count?: number | null
          comment_count?: number | null
          content?: Json | null
          dislike_count?: number | null
          id?: string | null
          is_sub_page?: boolean | null
          last_viewed_at?: string | null
          like_count?: number | null
          parent_id?: string | null
          published_at?: string | null
          published_nota_citations?: Json | null
          tags?: string[] | null
          title?: string | null
          unique_viewers?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "published_notas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_published_notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_notas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_notas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      api_request_boundary: { Args: never; Returns: undefined }
      append_legacy_migration_audit: {
        Args: {
          p_event: Json
          p_idempotency_key: string
          p_lease_owner: string
          p_run_id: string
        }
        Returns: string
      }
      apply_legacy_migration_target: {
        Args: {
          p_entity_kind: string
          p_existing_row: Json
          p_insert_row: Json
          p_lease_owner: string
          p_run_id: string
          p_source_key_hash: string
          p_target_key: Json
        }
        Returns: string
      }
      assert_legacy_migration_rollback_lease: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: undefined
      }
      assert_legacy_migration_run_lease: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: undefined
      }
      claim_unreferenced_published_images: {
        Args: { p_owner_id: string; p_paths: string[] }
        Returns: {
          claimed_at: string
          claimed_path: string
        }[]
      }
      complete_legacy_migration_record: {
        Args: {
          p_entity_kind: string
          p_lease_owner: string
          p_run_id: string
          p_source_hash: string
          p_source_key_hash: string
          p_target_hash: string
        }
        Returns: undefined
      }
      count_comments: {
        Args: { p_nota_id: string; p_parent_id?: string }
        Returns: number
      }
      create_comment: {
        Args: {
          p_author_name?: string
          p_content: Json
          p_id: string
          p_nota_id: string
          p_parent_id?: string
        }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_comment_bounded_impl: {
        Args: {
          p_author_name?: string
          p_content: Json
          p_id: string
          p_nota_id: string
          p_parent_id?: string
        }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_user_owns_published_nota: {
        Args: { p_nota_id: string }
        Returns: boolean
      }
      delete_comment: { Args: { p_id: string }; Returns: undefined }
      delete_comment_bounded_impl: {
        Args: { p_id: string }
        Returns: undefined
      }
      edit_comment: {
        Args: { p_content: Json; p_id: string }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      edit_comment_bounded_impl: {
        Args: { p_content: Json; p_id: string }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fail_legacy_migration_record: {
        Args: {
          p_entity_kind: string
          p_error_class: string
          p_lease_owner: string
          p_run_id: string
          p_source_key_hash: string
        }
        Returns: undefined
      }
      finish_legacy_migration_run: {
        Args: {
          p_counters: Json
          p_lease_owner: string
          p_run_id: string
          p_status: string
        }
        Returns: undefined
      }
      get_comment_vote: { Args: { p_comment_id: string }; Returns: string }
      get_nota_vote: { Args: { p_nota_id: string }; Returns: string }
      legacy_migration_target_snapshot: {
        Args: { p_entity_kind: string; p_target_key: Json }
        Returns: Json
      }
      mark_legacy_migration_rolled_back: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: undefined
      }
      migrate_firebase_identity: {
        Args: {
          p_display_name: string
          p_firebase_uid: string
          p_photo_url: string
          p_provider: string
          p_provider_uid: string
          p_source_hash: string
          p_supabase_user_id: string
          p_user_tag: string
          p_verified_email: string
        }
        Returns: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      normalize_legacy_migration_target: {
        Args: { p_entity_kind: string; p_payload: Json }
        Returns: Json
      }
      preflight_legacy_migration_target: {
        Args: {
          p_entity_kind: string
          p_expected_row: Json
          p_target_key: Json
        }
        Returns: string
      }
      provision_user_profile: {
        Args: {
          p_display_name?: string
          p_photo_url?: string
          p_user_tag: string
        }
        Returns: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      provision_user_profile_bounded_impl: {
        Args: {
          p_display_name?: string
          p_photo_url?: string
          p_user_tag: string
        }
        Returns: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_nota: {
        Args: {
          p_author_name: string
          p_child_ids?: string[]
          p_citations?: Json
          p_content: Json
          p_id: string
          p_is_sub_page?: boolean
          p_parent_id?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: {
          author_name: string | null
          clone_count: number | null
          comment_count: number | null
          content: Json | null
          dislike_count: number | null
          id: string | null
          is_sub_page: boolean | null
          last_viewed_at: string | null
          like_count: number | null
          parent_id: string | null
          published_at: string | null
          published_nota_citations: Json | null
          tags: string[] | null
          title: string | null
          unique_viewers: number | null
          updated_at: string | null
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_published_notas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      publish_nota_bounded_impl: {
        Args: {
          p_author_name: string
          p_child_ids?: string[]
          p_citations?: Json
          p_content: Json
          p_id: string
          p_is_sub_page?: boolean
          p_parent_id?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: {
          author_name: string | null
          clone_count: number | null
          comment_count: number | null
          content: Json | null
          dislike_count: number | null
          id: string | null
          is_sub_page: boolean | null
          last_viewed_at: string | null
          like_count: number | null
          parent_id: string | null
          published_at: string | null
          published_nota_citations: Json | null
          tags: string[] | null
          title: string | null
          unique_viewers: number | null
          updated_at: string | null
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_published_notas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      publish_nota_hierarchy: {
        Args: { p_publications: Json }
        Returns: {
          author_name: string | null
          clone_count: number | null
          comment_count: number | null
          content: Json | null
          dislike_count: number | null
          id: string | null
          is_sub_page: boolean | null
          last_viewed_at: string | null
          like_count: number | null
          parent_id: string | null
          published_at: string | null
          published_nota_citations: Json | null
          tags: string[] | null
          title: string | null
          unique_viewers: number | null
          updated_at: string | null
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_published_notas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      publish_nota_hierarchy_bounded_impl: {
        Args: { p_publications: Json }
        Returns: {
          author_name: string | null
          clone_count: number | null
          comment_count: number | null
          content: Json | null
          dislike_count: number | null
          id: string | null
          is_sub_page: boolean | null
          last_viewed_at: string | null
          like_count: number | null
          parent_id: string | null
          published_at: string | null
          published_nota_citations: Json | null
          tags: string[] | null
          title: string | null
          unique_viewers: number | null
          updated_at: string | null
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_published_notas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      query_comments: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
          p_nota_id: string
          p_parent_id?: string
        }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      query_comments_bounded_impl: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
          p_nota_id: string
          p_parent_id?: string
        }
        Returns: Database["public"]["CompositeTypes"]["community_comment_result"][]
        SetofOptions: {
          from: "*"
          to: "community_comment_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      query_publications: {
        Args: {
          p_author_id?: string
          p_author_tag?: string
          p_before_id?: string
          p_before_published_at?: string
          p_id?: string
          p_limit?: number
          p_owner_only?: boolean
        }
        Returns: {
          author_name: string
          author_tag: string
          clone_count: number
          comment_count: number
          content: Json
          dislike_count: number
          id: string
          is_sub_page: boolean
          last_viewed_at: string
          like_count: number
          parent_id: string
          published_at: string
          published_nota_citations: Json
          published_sub_pages: string[]
          tags: string[]
          title: string
          unique_viewers: number
          updated_at: string
          view_count: number
        }[]
      }
      query_publications_bounded_impl: {
        Args: {
          p_author_id?: string
          p_author_tag?: string
          p_before_id?: string
          p_before_published_at?: string
          p_id?: string
          p_limit?: number
          p_owner_only?: boolean
        }
        Returns: {
          author_name: string
          author_tag: string
          clone_count: number
          comment_count: number
          content: Json
          dislike_count: number
          id: string
          is_sub_page: boolean
          last_viewed_at: string
          like_count: number
          parent_id: string
          published_at: string
          published_nota_citations: Json
          published_sub_pages: string[]
          tags: string[]
          title: string
          unique_viewers: number
          updated_at: string
          view_count: number
        }[]
      }
      reconcile_legacy_migration: { Args: never; Returns: Json }
      record_nota_clone: { Args: { p_nota_id: string }; Returns: number }
      record_nota_clone_bounded_impl: {
        Args: { p_nota_id: string }
        Returns: number
      }
      record_nota_view: {
        Args: { p_nota_id: string; p_referrer_key?: string }
        Returns: {
          unique_viewers: number
          view_count: number
        }[]
      }
      record_nota_view_bounded_impl: {
        Args: { p_nota_id: string; p_referrer_key?: string }
        Returns: {
          unique_viewers: number
          view_count: number
        }[]
      }
      rename_user_tag: {
        Args: { p_photo_url?: string; p_user_tag: string }
        Returns: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rename_user_tag_bounded_impl: {
        Args: { p_photo_url?: string; p_user_tag: string }
        Returns: {
          display_name: string
          photo_url: string
          updated_at: string
          user_id: string
          user_tag: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_legacy_migration_record: {
        Args: {
          p_entity_kind: string
          p_lease_owner: string
          p_run_id: string
          p_sequence: number
          p_source_hash: string
          p_source_key_hash: string
          p_target_hash: string
          p_target_key: Json
        }
        Returns: string
      }
      rollback_next_legacy_migration_record: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: string
      }
      start_legacy_migration_rollback: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: string
      }
      start_legacy_migration_run: {
        Args: {
          p_dry_run: boolean
          p_identity_plan_hash: string
          p_lease_owner: string
          p_manifest_hash: string
          p_run_id: string
          p_source_watermark: string
          p_tool_version: string
        }
        Returns: undefined
      }
      toggle_comment_vote: {
        Args: {
          p_comment_id: string
          p_vote: Database["public"]["Enums"]["vote_type"]
        }
        Returns: Database["public"]["CompositeTypes"]["community_vote_result"]
        SetofOptions: {
          from: "*"
          to: "community_vote_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_comment_vote_bounded_impl: {
        Args: {
          p_comment_id: string
          p_vote: Database["public"]["Enums"]["vote_type"]
        }
        Returns: Database["public"]["CompositeTypes"]["community_vote_result"]
        SetofOptions: {
          from: "*"
          to: "community_vote_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_nota_vote: {
        Args: {
          p_nota_id: string
          p_vote: Database["public"]["Enums"]["vote_type"]
        }
        Returns: Database["public"]["CompositeTypes"]["community_vote_result"]
        SetofOptions: {
          from: "*"
          to: "community_vote_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_nota_vote_bounded_impl: {
        Args: {
          p_nota_id: string
          p_vote: Database["public"]["Enums"]["vote_type"]
        }
        Returns: Database["public"]["CompositeTypes"]["community_vote_result"]
        SetofOptions: {
          from: "*"
          to: "community_vote_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpublish_nota: { Args: { p_id: string }; Returns: string[] }
      unpublish_nota_bounded_impl: { Args: { p_id: string }; Returns: string[] }
      unsubscribe_newsletter: { Args: never; Returns: undefined }
      upsert_newsletter_subscription: {
        Args: { p_display_name?: string; p_email: string }
        Returns: undefined
      }
      upsert_newsletter_subscription_bounded_impl: {
        Args: { p_display_name?: string; p_email: string }
        Returns: undefined
      }
      verify_production_cutover: {
        Args: {
          p_migration_evidence_sha256: string
          p_public_config_sha256: string
          p_reconciliation_evidence_sha256: string
        }
        Returns: boolean
      }
    }
    Enums: {
      vote_type: "like" | "dislike"
    }
    CompositeTypes: {
      authenticated_api_request: {
        user_id: string | null
        role_name: string | null
      }
      community_comment_result: {
        id: string | null
        nota_id: string | null
        author_name: string | null
        author_tag: string | null
        content: Json | null
        parent_id: string | null
        like_count: number | null
        dislike_count: number | null
        reply_count: number | null
        created_at: string | null
        updated_at: string | null
        is_owner: boolean | null
        can_delete: boolean | null
        user_vote: string | null
      }
      community_vote_result: {
        like_count: number | null
        dislike_count: number | null
        user_vote: string | null
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
  public: {
    Enums: {
      vote_type: ["like", "dislike"],
    },
  },
} as const
