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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_insights: {
        Row: {
          confidence: number
          created_at: string
          delta_percentage: number | null
          dismissed_count: number
          dismissed_until: string | null
          finding: string
          format: string | null
          id: string
          insight_type: string
          last_updated: string
          metadata: Json
          network: string | null
          never_show: boolean
          p_value: number | null
          sample_size: number
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          delta_percentage?: number | null
          dismissed_count?: number
          dismissed_until?: string | null
          finding: string
          format?: string | null
          id?: string
          insight_type: string
          last_updated?: string
          metadata?: Json
          network?: string | null
          never_show?: boolean
          p_value?: number | null
          sample_size: number
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          delta_percentage?: number | null
          dismissed_count?: number
          dismissed_until?: string | null
          finding?: string
          format?: string | null
          id?: string
          insight_type?: string
          last_updated?: string
          metadata?: Json
          network?: string | null
          never_show?: boolean
          p_value?: number | null
          sample_size?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_usage: {
        Row: {
          action: string
          created_at: string
          credits: number
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          credits: number
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          credits?: number
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_preferences: {
        Row: {
          auto_alt_text: boolean
          auto_first_comment: boolean
          brand_hashtags: string[]
          created_at: string
          default_tone: string
          dismissed_insights: Json
          id: string
          insights_enabled: boolean
          muted_insight_types: string[]
          preferred_language: string
          preferred_model: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_alt_text?: boolean
          auto_first_comment?: boolean
          brand_hashtags?: string[]
          created_at?: string
          default_tone?: string
          dismissed_insights?: Json
          id?: string
          insights_enabled?: boolean
          muted_insight_types?: string[]
          preferred_language?: string
          preferred_model?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_alt_text?: boolean
          auto_first_comment?: boolean
          brand_hashtags?: string[]
          created_at?: string
          default_tone?: string
          dismissed_insights?: Json
          id?: string
          insights_enabled?: boolean
          muted_insight_types?: string[]
          preferred_language?: string
          preferred_model?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          action_type: string
          created_at: string | null
          credits_consumed: number
          error_message: string | null
          feature: string | null
          id: string
          metadata: Json
          model: string | null
          provider: string | null
          success: boolean
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          credits_consumed: number
          error_message?: string | null
          feature?: string | null
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          success: boolean
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          credits_consumed?: number
          error_message?: string | null
          feature?: string | null
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_alerts: {
        Row: {
          account_username: string
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          metric: string
          operator: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_username: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric: string
          operator?: string
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_username?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric?: string
          operator?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_bookmarks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          post_shortcode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          post_shortcode: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          post_shortcode?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_insights: {
        Row: {
          component_name: string
          created_at: string | null
          data_hash: string
          id: string
          insights_json: Json
          user_id: string
        }
        Insert: {
          component_name: string
          created_at?: string | null
          data_hash: string
          id?: string
          insights_json: Json
          user_id: string
        }
        Update: {
          component_name?: string
          created_at?: string | null
          data_hash?: string
          id?: string
          insights_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      hashtag_intelligence: {
        Row: {
          created_at: string
          hashtag: string
          id: string
          metadata: Json
          source: string
          status: string | null
          updated_at: string
          verified_at: string
          volume_estimate: number | null
        }
        Insert: {
          created_at?: string
          hashtag: string
          id?: string
          metadata?: Json
          source: string
          status?: string | null
          updated_at?: string
          verified_at: string
          volume_estimate?: number | null
        }
        Update: {
          created_at?: string
          hashtag?: string
          id?: string
          metadata?: Json
          source?: string
          status?: string | null
          updated_at?: string
          verified_at?: string
          volume_estimate?: number | null
        }
        Relationships: []
      }
      hashtag_metadata: {
        Row: {
          hashtag: string
          last_verified: string | null
          notes: string | null
          source: string | null
          status: string | null
          volume_estimate: number | null
        }
        Insert: {
          hashtag: string
          last_verified?: string | null
          notes?: string | null
          source?: string | null
          status?: string | null
          volume_estimate?: number | null
        }
        Update: {
          hashtag?: string
          last_verified?: string | null
          notes?: string | null
          source?: string | null
          status?: string | null
          volume_estimate?: number | null
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          key: string
          result: Json | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          key: string
          result?: Json | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          key?: string
          result?: Json | null
        }
        Relationships: []
      }
      instagram_analytics: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string | null
          dimensions_height: number | null
          dimensions_width: number | null
          engagement_rate: number | null
          hashtags: string[] | null
          id: string
          imported_at: string | null
          is_video: boolean | null
          likes_count: number | null
          location_name: string | null
          media_urls: string[] | null
          owner_username: string | null
          post_type: string | null
          post_url: string
          posted_at: string | null
          shortcode: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          video_duration: number | null
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          dimensions_height?: number | null
          dimensions_width?: number | null
          engagement_rate?: number | null
          hashtags?: string[] | null
          id?: string
          imported_at?: string | null
          is_video?: boolean | null
          likes_count?: number | null
          location_name?: string | null
          media_urls?: string[] | null
          owner_username?: string | null
          post_type?: string | null
          post_url: string
          posted_at?: string | null
          shortcode?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          video_duration?: number | null
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          dimensions_height?: number | null
          dimensions_width?: number | null
          engagement_rate?: number | null
          hashtags?: string[] | null
          id?: string
          imported_at?: string | null
          is_video?: boolean | null
          likes_count?: number | null
          location_name?: string | null
          media_urls?: string[] | null
          owner_username?: string | null
          post_type?: string | null
          post_url?: string
          posted_at?: string | null
          shortcode?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          video_duration?: number | null
          views_count?: number | null
        }
        Relationships: []
      }
      instagram_profiles: {
        Row: {
          biography: string | null
          business_category: string | null
          created_at: string | null
          external_url: string | null
          external_urls: Json | null
          followers_count: number | null
          follows_count: number | null
          full_name: string | null
          highlight_reel_count: number | null
          id: string
          instagram_id: string
          is_business_account: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          posts_count: number | null
          profile_pic_url: string | null
          profile_pic_url_hd: string | null
          scraped_at: string | null
          scraped_date: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          biography?: string | null
          business_category?: string | null
          created_at?: string | null
          external_url?: string | null
          external_urls?: Json | null
          followers_count?: number | null
          follows_count?: number | null
          full_name?: string | null
          highlight_reel_count?: number | null
          id?: string
          instagram_id: string
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          posts_count?: number | null
          profile_pic_url?: string | null
          profile_pic_url_hd?: string | null
          scraped_at?: string | null
          scraped_date?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          biography?: string | null
          business_category?: string | null
          created_at?: string | null
          external_url?: string | null
          external_urls?: Json | null
          followers_count?: number | null
          follows_count?: number | null
          full_name?: string | null
          highlight_reel_count?: number | null
          id?: string
          instagram_id?: string
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          posts_count?: number | null
          profile_pic_url?: string | null
          profile_pic_url_hd?: string | null
          scraped_at?: string | null
          scraped_date?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          ai_prompt: string | null
          aspect_ratio: string | null
          created_at: string
          duration: number | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          is_favorite: boolean | null
          post_id: string | null
          publication_url: string | null
          source: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          ai_prompt?: string | null
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          post_id?: string | null
          publication_url?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          ai_prompt?: string | null
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          post_id?: string | null
          publication_url?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_metrics_raw: {
        Row: {
          captured_at: string
          captured_hour: string
          clicks: number | null
          comments: number | null
          created_at: string
          engagement_rate_normalized: number | null
          external_post_id: string | null
          id: string
          impressions: number | null
          likes: number | null
          network: string
          post_id: string
          raw_data: Json
          reach: number | null
          saves: number | null
          shares: number | null
          user_id: string
          video_completion_rate: number | null
        }
        Insert: {
          captured_at?: string
          captured_hour: string
          clicks?: number | null
          comments?: number | null
          created_at?: string
          engagement_rate_normalized?: number | null
          external_post_id?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          network: string
          post_id: string
          raw_data?: Json
          reach?: number | null
          saves?: number | null
          shares?: number | null
          user_id: string
          video_completion_rate?: number | null
        }
        Update: {
          captured_at?: string
          captured_hour?: string
          clicks?: number | null
          comments?: number | null
          created_at?: string
          engagement_rate_normalized?: number | null
          external_post_id?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          network?: string
          post_id?: string
          raw_data?: Json
          reach?: number | null
          saves?: number | null
          shares?: number | null
          user_id?: string
          video_completion_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_raw_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_performance: {
        Row: {
          captured_at: string
          classification: string
          comments: number
          completion_rate: number | null
          created_at: string
          engagement_rate: number
          features_extracted: Json
          id: string
          impressions: number | null
          likes: number
          network: string
          post_id: string | null
          reach: number | null
          saves: number
          shares: number
          user_id: string
        }
        Insert: {
          captured_at?: string
          classification?: string
          comments?: number
          completion_rate?: number | null
          created_at?: string
          engagement_rate?: number
          features_extracted?: Json
          id?: string
          impressions?: number | null
          likes?: number
          network: string
          post_id?: string | null
          reach?: number | null
          saves?: number
          shares?: number
          user_id: string
        }
        Update: {
          captured_at?: string
          classification?: string
          comments?: number
          completion_rate?: number | null
          created_at?: string
          engagement_rate?: number
          features_extracted?: Json
          id?: string
          impressions?: number | null
          likes?: number
          network?: string
          post_id?: string | null
          reach?: number | null
          saves?: number
          shares?: number
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          ai_features_extracted: Json | null
          ai_generated_fields: Json | null
          ai_metadata: Json
          alt_texts: Json | null
          approval_comments: string | null
          caption: string
          caption_edited: string | null
          content_type: string | null
          cover_image_url: string | null
          created_at: string | null
          engagement_rate: number | null
          error_log: string | null
          external_post_ids: Json | null
          failed_at: string | null
          first_comment: string | null
          hashtags: string[] | null
          hashtags_edited: string[] | null
          hashtags_text: string | null
          id: string
          linkedin_body: string | null
          linkedin_external_id: string | null
          linkedin_permalink: string | null
          linkedin_published: boolean | null
          media_items: Json | null
          media_urls_backup: Json | null
          metrics_captured_at: string | null
          network_options: Json | null
          network_validations: Json | null
          notes: string | null
          origin_mode: string | null
          performance_classification: string | null
          post_type: string | null
          publish_metadata: Json | null
          publish_targets: Json | null
          published_at: string | null
          raw_transcription: string | null
          recovered_from_post_id: string | null
          recovery_token: string | null
          retry_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_asap: boolean | null
          scheduled_date: string | null
          selected_networks: string[] | null
          selected_template: string | null
          source: string | null
          status: string | null
          tema: string
          template_a_images: string[]
          template_a_metadata: Json | null
          template_b_images: string[]
          template_b_metadata: Json | null
          updated_at: string | null
          user_id: string | null
          utm_preset: string | null
          workflow_id: string
        }
        Insert: {
          ai_features_extracted?: Json | null
          ai_generated_fields?: Json | null
          ai_metadata?: Json
          alt_texts?: Json | null
          approval_comments?: string | null
          caption: string
          caption_edited?: string | null
          content_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          error_log?: string | null
          external_post_ids?: Json | null
          failed_at?: string | null
          first_comment?: string | null
          hashtags?: string[] | null
          hashtags_edited?: string[] | null
          hashtags_text?: string | null
          id?: string
          linkedin_body?: string | null
          linkedin_external_id?: string | null
          linkedin_permalink?: string | null
          linkedin_published?: boolean | null
          media_items?: Json | null
          media_urls_backup?: Json | null
          metrics_captured_at?: string | null
          network_options?: Json | null
          network_validations?: Json | null
          notes?: string | null
          origin_mode?: string | null
          performance_classification?: string | null
          post_type?: string | null
          publish_metadata?: Json | null
          publish_targets?: Json | null
          published_at?: string | null
          raw_transcription?: string | null
          recovered_from_post_id?: string | null
          recovery_token?: string | null
          retry_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_asap?: boolean | null
          scheduled_date?: string | null
          selected_networks?: string[] | null
          selected_template?: string | null
          source?: string | null
          status?: string | null
          tema: string
          template_a_images: string[]
          template_a_metadata?: Json | null
          template_b_images: string[]
          template_b_metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
          utm_preset?: string | null
          workflow_id: string
        }
        Update: {
          ai_features_extracted?: Json | null
          ai_generated_fields?: Json | null
          ai_metadata?: Json
          alt_texts?: Json | null
          approval_comments?: string | null
          caption?: string
          caption_edited?: string | null
          content_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          error_log?: string | null
          external_post_ids?: Json | null
          failed_at?: string | null
          first_comment?: string | null
          hashtags?: string[] | null
          hashtags_edited?: string[] | null
          hashtags_text?: string | null
          id?: string
          linkedin_body?: string | null
          linkedin_external_id?: string | null
          linkedin_permalink?: string | null
          linkedin_published?: boolean | null
          media_items?: Json | null
          media_urls_backup?: Json | null
          metrics_captured_at?: string | null
          network_options?: Json | null
          network_validations?: Json | null
          notes?: string | null
          origin_mode?: string | null
          performance_classification?: string | null
          post_type?: string | null
          publish_metadata?: Json | null
          publish_targets?: Json | null
          published_at?: string | null
          raw_transcription?: string | null
          recovered_from_post_id?: string | null
          recovery_token?: string | null
          retry_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_asap?: boolean | null
          scheduled_date?: string | null
          selected_networks?: string[] | null
          selected_template?: string | null
          source?: string | null
          status?: string | null
          tema?: string
          template_a_images?: string[]
          template_a_metadata?: Json | null
          template_b_images?: string[]
          template_b_metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
          utm_preset?: string | null
          workflow_id?: string
        }
        Relationships: []
      }
      posts_drafts: {
        Row: {
          ai_metadata: Json
          caption: string | null
          created_at: string
          format: string | null
          formats: string[] | null
          id: string
          media_items: Json | null
          media_urls: Json | null
          network_captions: Json | null
          network_options: Json | null
          platform: string
          publish_immediately: boolean | null
          raw_transcription: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          updated_at: string
          use_separate_captions: boolean | null
          user_id: string
        }
        Insert: {
          ai_metadata?: Json
          caption?: string | null
          created_at?: string
          format?: string | null
          formats?: string[] | null
          id?: string
          media_items?: Json | null
          media_urls?: Json | null
          network_captions?: Json | null
          network_options?: Json | null
          platform: string
          publish_immediately?: boolean | null
          raw_transcription?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          use_separate_captions?: boolean | null
          user_id: string
        }
        Update: {
          ai_metadata?: Json
          caption?: string | null
          created_at?: string
          format?: string | null
          formats?: string[] | null
          id?: string
          media_items?: Json | null
          media_urls?: Json | null
          network_captions?: Json | null
          network_options?: Json | null
          platform?: string
          publish_immediately?: boolean | null
          raw_transcription?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          use_separate_captions?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          structure: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          structure?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          structure?: Json
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          due_date: string | null
          icon: string
          id: string
          name: string
          owner_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon: string
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      publication_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          error_message: string | null
          format: string | null
          id: string
          platform: string
          post_id: string | null
          response_data: Json | null
          status: string
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          format?: string | null
          id?: string
          platform: string
          post_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Update: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          format?: string | null
          id?: string
          platform?: string
          post_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_attempts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_quota: {
        Row: {
          created_at: string
          id: string
          platform: string
          post_id: string | null
          post_type: string
          published_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          post_id?: string | null
          post_type: string
          published_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          post_id?: string | null
          post_type?: string
          published_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_quota_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_overrides: {
        Row: {
          created_at: string
          id: string
          instagram_limit: number
          instagram_used: number
          linkedin_limit: number
          linkedin_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_limit?: number
          instagram_used?: number
          linkedin_limit?: number
          linkedin_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_limit?: number
          instagram_used?: number
          linkedin_limit?: number
          linkedin_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_captions: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_log: Json | null
          error_message: string | null
          id: string
          job_type: string
          last_attempt_at: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json | null
          post_id: string | null
          scheduled_for: string
          status: string
          story_id: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          error_message?: string | null
          id?: string
          job_type?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json | null
          post_id?: string | null
          scheduled_for: string
          status?: string
          story_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          error_message?: string | null
          id?: string
          job_type?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json | null
          post_id?: string | null
          scheduled_for?: string
          status?: string
          story_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          access_token: string | null
          connection_status: string
          created_at: string
          id: string
          network: string
          profile_handle: string | null
          profile_image_url: string | null
          profile_metadata: Json | null
          profile_name: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          network: string
          profile_handle?: string | null
          profile_image_url?: string | null
          profile_metadata?: Json | null
          profile_name: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          network?: string
          profile_handle?: string | null
          profile_image_url?: string | null
          profile_metadata?: Json | null
          profile_name?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string
          created_at: string | null
          drive_url: string | null
          error_log: string | null
          getlate_post_id: string | null
          id: string
          idioma: string | null
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_date: string | null
          status: string | null
          story_image_url: string
          tema: string | null
          texto_base: string | null
          titulo_slide: string | null
        }
        Insert: {
          caption: string
          created_at?: string | null
          drive_url?: string | null
          error_log?: string | null
          getlate_post_id?: string | null
          id?: string
          idioma?: string | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_date?: string | null
          status?: string | null
          story_image_url: string
          tema?: string | null
          texto_base?: string | null
          titulo_slide?: string | null
        }
        Update: {
          caption?: string
          created_at?: string | null
          drive_url?: string | null
          error_log?: string | null
          getlate_post_id?: string | null
          id?: string
          idioma?: string | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_date?: string | null
          status?: string | null
          story_image_url?: string
          tema?: string | null
          texto_base?: string | null
          titulo_slide?: string | null
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
          type: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
          type?: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_milestones: {
        Row: {
          created_at: string
          id: string
          milestone_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_milestones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          project_id: string
          reporter_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id: string
          reporter_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string
          reporter_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_credits: {
        Row: {
          credits_monthly_allowance: number
          credits_remaining: number
          last_reset_at: string | null
          plan_tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          credits_monthly_allowance?: number
          credits_remaining?: number
          last_reset_at?: string | null
          plan_tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          credits_monthly_allowance?: number
          credits_remaining?: number
          last_reset_at?: string | null
          plan_tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_brand_hashtags: {
        Row: {
          created_at: string | null
          hashtag: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hashtag: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hashtag?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_hashtag_history: {
        Row: {
          created_at: string
          hashtag: string
          id: string
          last_used_at: string
          times_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hashtag: string
          id?: string
          last_used_at?: string
          times_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hashtag?: string
          id?: string
          last_used_at?: string
          times_used?: number
          updated_at?: string
          user_id?: string
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
      calculate_ai_credit_usage: {
        Args: {
          _action: string
          _credits: number
          _metadata?: Json
          _user_id: string
        }
        Returns: undefined
      }
      calculate_next_retry: { Args: { attempts: number }; Returns: string }
      can_publish_to_instagram: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: undefined }
      consume_ai_credits: {
        Args: { _credits: number; _user_id: string }
        Returns: boolean
      }
      get_instagram_quota_usage: {
        Args: { p_user_id: string }
        Returns: {
          limit_count: number
          remaining: number
          used_count: number
        }[]
      }
      get_linkedin_quota_usage: {
        Args: { p_user_id: string }
        Returns: {
          limit_count: number
          remaining: number
          used_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_ai_usage: {
        Args: {
          _action_type: string
          _credits_consumed: number
          _error_message?: string
          _feature: string
          _metadata?: Json
          _model: string
          _provider: string
          _success: boolean
          _tokens_used: number
          _user_id: string
        }
        Returns: undefined
      }
      update_account_insight_visibility: {
        Args: { _action: string; _insight_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
