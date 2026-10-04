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
    PostgrestVersion: "14.5"
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
      art_rascunhos: {
        Row: {
          corpo: string
          created_at: string
          created_by: string
          estado: string
          id: string
          project_id: string | null
          resumo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          corpo?: string
          created_at?: string
          created_by?: string
          estado?: string
          id?: string
          project_id?: string | null
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          corpo?: string
          created_at?: string
          created_by?: string
          estado?: string
          id?: string
          project_id?: string | null
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "art_rascunhos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estudio_identidades: {
        Row: {
          chave: string
          created_at: string
          id: string
          nome: string
          project_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          nome: string
          project_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          nome?: string
          project_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudio_identidades_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estudio_preferencias: {
        Row: {
          identidade_id: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          identidade_id?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          identidade_id?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudio_preferencias_identidade_id_fkey"
            columns: ["identidade_id"]
            isOneToOne: false
            referencedRelation: "estudio_identidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estudio_preferencias_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      linkedin_mention_cache: {
        Row: {
          display_name_hint: string | null
          expires_at: string
          mention_format: string
          profile_url: string
          resolved_at: string
          urn: string
        }
        Insert: {
          display_name_hint?: string | null
          expires_at?: string
          mention_format: string
          profile_url: string
          resolved_at?: string
          urn: string
        }
        Update: {
          display_name_hint?: string | null
          expires_at?: string
          mention_format?: string
          profile_url?: string
          resolved_at?: string
          urn?: string
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
      nl_audit_log: {
        Row: {
          accao: string
          criado_em: string
          detalhe: Json | null
          id: number
          quem: string | null
        }
        Insert: {
          accao: string
          criado_em?: string
          detalhe?: Json | null
          id?: never
          quem?: string | null
        }
        Update: {
          accao?: string
          criado_em?: string
          detalhe?: Json | null
          id?: never
          quem?: string | null
        }
        Relationships: []
      }
      nl_brief_edicoes: {
        Row: {
          brief_id: string
          created_at: string
          edicao_id: string
          id: string
          ordem: number
          papel: string
          titulo_apresentado: string | null
        }
        Insert: {
          brief_id: string
          created_at?: string
          edicao_id: string
          id?: string
          ordem?: number
          papel?: string
          titulo_apresentado?: string | null
        }
        Update: {
          brief_id?: string
          created_at?: string
          edicao_id?: string
          id?: string
          ordem?: number
          papel?: string
          titulo_apresentado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_brief_edicoes_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "nl_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_brief_edicoes_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_brief_eventos: {
        Row: {
          actualizado_em: string
          brief_slug: string
          contagem: number
          dia: string
          edicao_numero: number | null
          evento: string
          id: string
        }
        Insert: {
          actualizado_em?: string
          brief_slug?: string
          contagem?: number
          dia?: string
          edicao_numero?: number | null
          evento: string
          id?: string
        }
        Update: {
          actualizado_em?: string
          brief_slug?: string
          contagem?: number
          dia?: string
          edicao_numero?: number | null
          evento?: string
          id?: string
        }
        Relationships: []
      }
      nl_brief_versoes: {
        Row: {
          brief_id: string
          conteudo: Json
          criado_em: string
          criado_por: string | null
          hash: string
          id: string
          motivo: string | null
          versao: number
        }
        Insert: {
          brief_id: string
          conteudo?: Json
          criado_em?: string
          criado_por?: string | null
          hash: string
          id?: string
          motivo?: string | null
          versao: number
        }
        Update: {
          brief_id?: string
          conteudo?: Json
          criado_em?: string
          criado_por?: string | null
          hash?: string
          id?: string
          motivo?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_brief_versoes_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "nl_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_briefs: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          contexto: Json
          created_at: string
          em_30_segundos: Json
          erro: string | null
          estado: string
          factos: Json
          fingerprint: string
          fonte_data: string | null
          fonte_primaria_url: string | null
          fonte_publisher: string | null
          fonte_url: string | null
          fonte_url_norm: string | null
          fontes_adicionais: Json
          hash_publicado: string | null
          ia: Json
          id: string
          incertezas: Json
          indexavel: boolean
          leitura_aprovada: string
          leitura_sugerida: string
          noticia_id: string | null
          porque_interessa: Json
          publicado_em: string | null
          pull_quote_sugerida: string
          slug: string
          slug_congelado: boolean
          tentativas: number
          tese_editorial: string
          tipo: string
          titulo_editorial: string
          updated_at: string
          verificacao: Json
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          contexto?: Json
          created_at?: string
          em_30_segundos?: Json
          erro?: string | null
          estado?: string
          factos?: Json
          fingerprint: string
          fonte_data?: string | null
          fonte_primaria_url?: string | null
          fonte_publisher?: string | null
          fonte_url?: string | null
          fonte_url_norm?: string | null
          fontes_adicionais?: Json
          hash_publicado?: string | null
          ia?: Json
          id?: string
          incertezas?: Json
          indexavel?: boolean
          leitura_aprovada?: string
          leitura_sugerida?: string
          noticia_id?: string | null
          porque_interessa?: Json
          publicado_em?: string | null
          pull_quote_sugerida?: string
          slug: string
          slug_congelado?: boolean
          tentativas?: number
          tese_editorial?: string
          tipo?: string
          titulo_editorial?: string
          updated_at?: string
          verificacao?: Json
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          contexto?: Json
          created_at?: string
          em_30_segundos?: Json
          erro?: string | null
          estado?: string
          factos?: Json
          fingerprint?: string
          fonte_data?: string | null
          fonte_primaria_url?: string | null
          fonte_publisher?: string | null
          fonte_url?: string | null
          fonte_url_norm?: string | null
          fontes_adicionais?: Json
          hash_publicado?: string | null
          ia?: Json
          id?: string
          incertezas?: Json
          indexavel?: boolean
          leitura_aprovada?: string
          leitura_sugerida?: string
          noticia_id?: string | null
          porque_interessa?: Json
          publicado_em?: string | null
          pull_quote_sugerida?: string
          slug?: string
          slug_congelado?: boolean
          tentativas?: number
          tese_editorial?: string
          tipo?: string
          titulo_editorial?: string
          updated_at?: string
          verificacao?: Json
        }
        Relationships: [
          {
            foreignKeyName: "nl_briefs_noticia_id_fkey"
            columns: ["noticia_id"]
            isOneToOne: false
            referencedRelation: "nl_noticias"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_configuracoes: {
        Row: {
          actualizado_em: string
          chave: string
          valor: string | null
        }
        Insert: {
          actualizado_em?: string
          chave: string
          valor?: string | null
        }
        Update: {
          actualizado_em?: string
          chave?: string
          valor?: string | null
        }
        Relationships: []
      }
      nl_conteudos_derivados: {
        Row: {
          actualizado_em: string
          actualizado_por: string | null
          carrossel: Json | null
          created_at: string
          edicao_id: string
          fonte: Json
          fonte_aceite_em: string | null
          fonte_aceite_por: string | null
          fonte_hash: string
          id: string
          identidade_id: string | null
          project_id: string | null
          social_draft_id: string | null
          social_enviado_em: string | null
          tipo: string
          versao: number
        }
        Insert: {
          actualizado_em?: string
          actualizado_por?: string | null
          carrossel?: Json | null
          created_at?: string
          edicao_id: string
          fonte: Json
          fonte_aceite_em?: string | null
          fonte_aceite_por?: string | null
          fonte_hash: string
          id?: string
          identidade_id?: string | null
          project_id?: string | null
          social_draft_id?: string | null
          social_enviado_em?: string | null
          tipo: string
          versao?: number
        }
        Update: {
          actualizado_em?: string
          actualizado_por?: string | null
          carrossel?: Json | null
          created_at?: string
          edicao_id?: string
          fonte?: Json
          fonte_aceite_em?: string | null
          fonte_aceite_por?: string | null
          fonte_hash?: string
          id?: string
          identidade_id?: string | null
          project_id?: string | null
          social_draft_id?: string | null
          social_enviado_em?: string | null
          tipo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_conteudos_derivados_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_conteudos_derivados_identidade_id_fkey"
            columns: ["identidade_id"]
            isOneToOne: false
            referencedRelation: "estudio_identidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_conteudos_derivados_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_conteudos_jobs: {
        Row: {
          actualizado_em: string
          campanhas: Json
          confirmado_em: string | null
          conteudo_id: string
          created_at: string
          edicao_id: string
          erro: string | null
          estado: string
          fonte_hash: string
          id: string
          max_tentativas: number
          origem: string
          proxima_tentativa_em: string
          reservado_ate: string | null
          tentativas: number
          tipo: string
        }
        Insert: {
          actualizado_em?: string
          campanhas?: Json
          confirmado_em?: string | null
          conteudo_id: string
          created_at?: string
          edicao_id: string
          erro?: string | null
          estado: string
          fonte_hash: string
          id?: string
          max_tentativas?: number
          origem: string
          proxima_tentativa_em?: string
          reservado_ate?: string | null
          tentativas?: number
          tipo: string
        }
        Update: {
          actualizado_em?: string
          campanhas?: Json
          confirmado_em?: string | null
          conteudo_id?: string
          created_at?: string
          edicao_id?: string
          erro?: string | null
          estado?: string
          fonte_hash?: string
          id?: string
          max_tentativas?: number
          origem?: string
          proxima_tentativa_em?: string
          reservado_ate?: string | null
          tentativas?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_conteudos_jobs_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "nl_conteudos_derivados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_conteudos_jobs_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_conteudos_versoes: {
        Row: {
          carrossel: Json
          conteudo_id: string
          criado_em: string
          criado_por: string | null
          id: string
          origem: string
          versao: number
        }
        Insert: {
          carrossel: Json
          conteudo_id: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          origem: string
          versao: number
        }
        Update: {
          carrossel?: Json
          conteudo_id?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          origem?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_conteudos_versoes_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "nl_conteudos_derivados"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_cronicas: {
        Row: {
          busca: unknown
          concluida: boolean
          conteudo: string | null
          conteudo_html: string | null
          edicao_id: string
          id: string
          leituras_recomendadas: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          busca?: unknown
          concluida?: boolean
          conteudo?: string | null
          conteudo_html?: string | null
          edicao_id: string
          id?: string
          leituras_recomendadas?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          busca?: unknown
          concluida?: boolean
          conteudo?: string | null
          conteudo_html?: string | null
          edicao_id?: string
          id?: string
          leituras_recomendadas?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_cronicas_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: true
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_curadoria_config: {
        Row: {
          actualizado_em: string
          id: number
          janela_horas: number
          max_insercoes_por_corrida: number
          max_por_categoria: number
          max_por_dia: number
          max_por_dia_email: number
          max_por_email: number
          max_por_fonte: number
        }
        Insert: {
          actualizado_em?: string
          id?: number
          janela_horas?: number
          max_insercoes_por_corrida?: number
          max_por_categoria?: number
          max_por_dia?: number
          max_por_dia_email?: number
          max_por_email?: number
          max_por_fonte?: number
        }
        Update: {
          actualizado_em?: string
          id?: number
          janela_horas?: number
          max_insercoes_por_corrida?: number
          max_por_categoria?: number
          max_por_dia?: number
          max_por_dia_email?: number
          max_por_email?: number
          max_por_fonte?: number
        }
        Relationships: []
      }
      nl_curadoria_ferramentas_config: {
        Row: {
          activo: boolean
          actualizado_em: string
          dia_semana: number
          hora: number
          id: number
          max_por_corrida: number
        }
        Insert: {
          activo?: boolean
          actualizado_em?: string
          dia_semana?: number
          hora?: number
          id?: number
          max_por_corrida?: number
        }
        Update: {
          activo?: boolean
          actualizado_em?: string
          dia_semana?: number
          hora?: number
          id?: number
          max_por_corrida?: number
        }
        Relationships: []
      }
      nl_curadoria_fila: {
        Row: {
          created_at: string
          descricao: string
          email_recebido_id: string | null
          estado: string
          fonte_grupo: string | null
          fonte_id: string | null
          fonte_nome: string | null
          id: string
          motivo: string | null
          noticia_id: string | null
          origem: string
          publicado_em: string
          tentativas: number
          titulo: string
          updated_at: string
          url: string | null
          url_norm: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string
          email_recebido_id?: string | null
          estado?: string
          fonte_grupo?: string | null
          fonte_id?: string | null
          fonte_nome?: string | null
          id?: string
          motivo?: string | null
          noticia_id?: string | null
          origem?: string
          publicado_em?: string
          tentativas?: number
          titulo: string
          updated_at?: string
          url?: string | null
          url_norm?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          email_recebido_id?: string | null
          estado?: string
          fonte_grupo?: string | null
          fonte_id?: string | null
          fonte_nome?: string | null
          id?: string
          motivo?: string | null
          noticia_id?: string | null
          origem?: string
          publicado_em?: string
          tentativas?: number
          titulo?: string
          updated_at?: string
          url?: string | null
          url_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_curadoria_fila_email_recebido_id_fkey"
            columns: ["email_recebido_id"]
            isOneToOne: false
            referencedRelation: "nl_emails_recebidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_curadoria_fila_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "nl_fontes_curadoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_curadoria_fila_noticia_id_fkey"
            columns: ["noticia_id"]
            isOneToOne: false
            referencedRelation: "nl_noticias"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_definicoes_ia: {
        Row: {
          actualizado_por: string | null
          created_at: string
          estado: string
          id: string
          modelo: string
          provider: string
          ultimo_erro: string | null
          ultimo_teste_em: string | null
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          created_at?: string
          estado?: string
          id?: string
          modelo?: string
          provider?: string
          ultimo_erro?: string | null
          ultimo_teste_em?: string | null
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          created_at?: string
          estado?: string
          id?: string
          modelo?: string
          provider?: string
          ultimo_erro?: string | null
          ultimo_teste_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nl_edicoes: {
        Row: {
          agendado_para: string | null
          agendado_por: string | null
          agendamento_erro: string | null
          agendamento_estado: string
          agendamento_iniciado_em: string | null
          agendamento_listas: Json
          agendamento_wordpress: boolean
          assunto: string | null
          bloco_consultoria: Json
          bloco_livro: boolean
          bloco_recursos: boolean
          categorias_ocultas_email: Json
          created_at: string
          data_envio_prevista: string | null
          descricoes_ajustadas_em: string | null
          destinos: Json
          enviada_em: string | null
          envio_em_curso: string | null
          episodio_podcast_id: string | null
          estado: string
          fecho_pendente_em: string | null
          fecho_pendente_por: string | null
          id: string
          identidade_id: string | null
          links_ignorados: Json
          links_verificados: Json | null
          links_verificados_em: string | null
          numero: number
          revista_snapshot: Json | null
          snapshot_envio: Json | null
          template_version: string
          wordpress_post_id: number | null
          wordpress_post_url: string | null
        }
        Insert: {
          agendado_para?: string | null
          agendado_por?: string | null
          agendamento_erro?: string | null
          agendamento_estado?: string
          agendamento_iniciado_em?: string | null
          agendamento_listas?: Json
          agendamento_wordpress?: boolean
          assunto?: string | null
          bloco_consultoria?: Json
          bloco_livro?: boolean
          bloco_recursos?: boolean
          categorias_ocultas_email?: Json
          created_at?: string
          data_envio_prevista?: string | null
          descricoes_ajustadas_em?: string | null
          destinos?: Json
          enviada_em?: string | null
          envio_em_curso?: string | null
          episodio_podcast_id?: string | null
          estado?: string
          fecho_pendente_em?: string | null
          fecho_pendente_por?: string | null
          id?: string
          identidade_id?: string | null
          links_ignorados?: Json
          links_verificados?: Json | null
          links_verificados_em?: string | null
          numero: number
          revista_snapshot?: Json | null
          snapshot_envio?: Json | null
          template_version?: string
          wordpress_post_id?: number | null
          wordpress_post_url?: string | null
        }
        Update: {
          agendado_para?: string | null
          agendado_por?: string | null
          agendamento_erro?: string | null
          agendamento_estado?: string
          agendamento_iniciado_em?: string | null
          agendamento_listas?: Json
          agendamento_wordpress?: boolean
          assunto?: string | null
          bloco_consultoria?: Json
          bloco_livro?: boolean
          bloco_recursos?: boolean
          categorias_ocultas_email?: Json
          created_at?: string
          data_envio_prevista?: string | null
          descricoes_ajustadas_em?: string | null
          destinos?: Json
          enviada_em?: string | null
          envio_em_curso?: string | null
          episodio_podcast_id?: string | null
          estado?: string
          fecho_pendente_em?: string | null
          fecho_pendente_por?: string | null
          id?: string
          identidade_id?: string | null
          links_ignorados?: Json
          links_verificados?: Json | null
          links_verificados_em?: string | null
          numero?: number
          revista_snapshot?: Json | null
          snapshot_envio?: Json | null
          template_version?: string
          wordpress_post_id?: number | null
          wordpress_post_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_edicoes_episodio_podcast_id_fkey"
            columns: ["episodio_podcast_id"]
            isOneToOne: false
            referencedRelation: "nl_episodios_podcast"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_edicoes_identidade_id_fkey"
            columns: ["identidade_id"]
            isOneToOne: false
            referencedRelation: "estudio_identidades"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_egoi_campanhas: {
        Row: {
          aceite_em: string | null
          actualizado_em: string
          campaign_hash: string
          confirmado_em: string | null
          criado_em: string
          edicao_id: string
          estado: string
          estado_egoi: string | null
          id: string
          lista_id: string
        }
        Insert: {
          aceite_em?: string | null
          actualizado_em?: string
          campaign_hash: string
          confirmado_em?: string | null
          criado_em?: string
          edicao_id: string
          estado?: string
          estado_egoi?: string | null
          id?: string
          lista_id: string
        }
        Update: {
          aceite_em?: string | null
          actualizado_em?: string
          campaign_hash?: string
          confirmado_em?: string | null
          criado_em?: string
          edicao_id?: string
          estado?: string
          estado_egoi?: string | null
          id?: string
          lista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_egoi_campanhas_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_egoi_campanhas_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "nl_egoi_listas"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_egoi_listas: {
        Row: {
          activa: boolean
          created_at: string
          egoi_lista_id: string
          id: string
          nome: string
          ordem: number
          tipo: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          egoi_lista_id: string
          id?: string
          nome: string
          ordem?: number
          tipo?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          egoi_lista_id?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
        }
        Relationships: []
      }
      nl_emails_recebidos: {
        Row: {
          assunto: string | null
          classificacao: string | null
          classificacao_detalhe: Json
          corpo_hash: string | null
          corpo_html: string | null
          corpo_texto: string | null
          id: string
          message_id: string | null
          notas_processadas: number
          processado_em: string | null
          processamento_erro: string | null
          processamento_estado: string
          processamento_tentativas: number
          recebido_em: string
          remetente: string | null
          remetente_nome: string | null
        }
        Insert: {
          assunto?: string | null
          classificacao?: string | null
          classificacao_detalhe?: Json
          corpo_hash?: string | null
          corpo_html?: string | null
          corpo_texto?: string | null
          id?: string
          message_id?: string | null
          notas_processadas?: number
          processado_em?: string | null
          processamento_erro?: string | null
          processamento_estado?: string
          processamento_tentativas?: number
          recebido_em?: string
          remetente?: string | null
          remetente_nome?: string | null
        }
        Update: {
          assunto?: string | null
          classificacao?: string | null
          classificacao_detalhe?: Json
          corpo_hash?: string | null
          corpo_html?: string | null
          corpo_texto?: string | null
          id?: string
          message_id?: string | null
          notas_processadas?: number
          processado_em?: string | null
          processamento_erro?: string | null
          processamento_estado?: string
          processamento_tentativas?: number
          recebido_em?: string
          remetente?: string | null
          remetente_nome?: string | null
        }
        Relationships: []
      }
      nl_episodios_podcast: {
        Row: {
          codigo: string | null
          criado_em: string
          data_publicacao: string | null
          id: string
          titulo: string
          url: string | null
        }
        Insert: {
          codigo?: string | null
          criado_em?: string
          data_publicacao?: string | null
          id?: string
          titulo: string
          url?: string | null
        }
        Update: {
          codigo?: string | null
          criado_em?: string
          data_publicacao?: string | null
          id?: string
          titulo?: string
          url?: string | null
        }
        Relationships: []
      }
      nl_ferramentas_excluidas: {
        Row: {
          criado_em: string
          dominio: string | null
          id: string
          motivo: string | null
          nome_norm: string | null
        }
        Insert: {
          criado_em?: string
          dominio?: string | null
          id?: string
          motivo?: string | null
          nome_norm?: string | null
        }
        Update: {
          criado_em?: string
          dominio?: string | null
          id?: string
          motivo?: string | null
          nome_norm?: string | null
        }
        Relationships: []
      }
      nl_ferramentas_semana: {
        Row: {
          cor: string
          created_at: string
          cta_rotulo: string
          descricao: string | null
          edicao_id: string
          emoji: string | null
          etiqueta: string
          id: string
          nome: string | null
          posicao: number
          updated_at: string
          url: string | null
        }
        Insert: {
          cor?: string
          created_at?: string
          cta_rotulo?: string
          descricao?: string | null
          edicao_id: string
          emoji?: string | null
          etiqueta?: string
          id?: string
          nome?: string | null
          posicao: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          cor?: string
          created_at?: string
          cta_rotulo?: string
          descricao?: string | null
          edicao_id?: string
          emoji?: string | null
          etiqueta?: string
          id?: string
          nome?: string | null
          posicao?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_ferramentas_semana_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_ferramentas_sugeridas: {
        Row: {
          aprovada_em: string | null
          assunto_origem: string | null
          categoria: string | null
          cor: string
          criado_em: string
          descricao: string | null
          descricao_original: string | null
          edicao_aprovada_id: string | null
          edicao_usada_id: string | null
          emoji: string | null
          estado: string
          fonte_directorio_id: string | null
          fonte_email_id: string | null
          id: string
          nome: string
          remetente: string | null
          updated_at: string
          url: string
        }
        Insert: {
          aprovada_em?: string | null
          assunto_origem?: string | null
          categoria?: string | null
          cor?: string
          criado_em?: string
          descricao?: string | null
          descricao_original?: string | null
          edicao_aprovada_id?: string | null
          edicao_usada_id?: string | null
          emoji?: string | null
          estado?: string
          fonte_directorio_id?: string | null
          fonte_email_id?: string | null
          id?: string
          nome: string
          remetente?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          aprovada_em?: string | null
          assunto_origem?: string | null
          categoria?: string | null
          cor?: string
          criado_em?: string
          descricao?: string | null
          descricao_original?: string | null
          edicao_aprovada_id?: string | null
          edicao_usada_id?: string | null
          emoji?: string | null
          estado?: string
          fonte_directorio_id?: string | null
          fonte_email_id?: string | null
          id?: string
          nome?: string
          remetente?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_ferramentas_sugeridas_edicao_aprovada_id_fkey"
            columns: ["edicao_aprovada_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_ferramentas_sugeridas_edicao_usada_id_fkey"
            columns: ["edicao_usada_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_ferramentas_sugeridas_fonte_directorio_id_fkey"
            columns: ["fonte_directorio_id"]
            isOneToOne: false
            referencedRelation: "nl_fontes_curadoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_ferramentas_sugeridas_fonte_email_id_fkey"
            columns: ["fonte_email_id"]
            isOneToOne: false
            referencedRelation: "nl_emails_recebidos"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_fontes_curadoria: {
        Row: {
          activa: boolean
          created_at: string
          criada_em: string
          foca_ferramentas: boolean
          grupo: string | null
          id: string
          nome: string
          remetente_dominio: string | null
          remetente_email: string | null
          tipo: string
          ultima_recolha: string | null
          url_feed: string
          url_listagem: string | null
          zeros_consecutivos: number
        }
        Insert: {
          activa?: boolean
          created_at?: string
          criada_em?: string
          foca_ferramentas?: boolean
          grupo?: string | null
          id?: string
          nome: string
          remetente_dominio?: string | null
          remetente_email?: string | null
          tipo?: string
          ultima_recolha?: string | null
          url_feed: string
          url_listagem?: string | null
          zeros_consecutivos?: number
        }
        Update: {
          activa?: boolean
          created_at?: string
          criada_em?: string
          foca_ferramentas?: boolean
          grupo?: string | null
          id?: string
          nome?: string
          remetente_dominio?: string | null
          remetente_email?: string | null
          tipo?: string
          ultima_recolha?: string | null
          url_feed?: string
          url_listagem?: string | null
          zeros_consecutivos?: number
        }
        Relationships: []
      }
      nl_ia_uso: {
        Row: {
          brief_id: string | null
          criado_em: string
          custo_usd: number
          duracao_ms: number | null
          edicao_id: string | null
          erro: string | null
          id: string
          modelo: string
          operacao: string | null
          origem: string
          sucesso: boolean
          tokens_entrada_cache_hit: number
          tokens_entrada_cache_miss: number
          tokens_saida: number
        }
        Insert: {
          brief_id?: string | null
          criado_em?: string
          custo_usd?: number
          duracao_ms?: number | null
          edicao_id?: string | null
          erro?: string | null
          id?: string
          modelo: string
          operacao?: string | null
          origem: string
          sucesso?: boolean
          tokens_entrada_cache_hit?: number
          tokens_entrada_cache_miss?: number
          tokens_saida?: number
        }
        Update: {
          brief_id?: string | null
          criado_em?: string
          custo_usd?: number
          duracao_ms?: number | null
          edicao_id?: string | null
          erro?: string | null
          id?: string
          modelo?: string
          operacao?: string | null
          origem?: string
          sucesso?: boolean
          tokens_entrada_cache_hit?: number
          tokens_entrada_cache_miss?: number
          tokens_saida?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_ia_uso_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "nl_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_ia_uso_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_import_runs: {
        Row: {
          concluido_em: string | null
          created_at: string
          created_by: string
          estado: string
          ficheiro_sha256: string
          id: string
          manifesto: Json
          modo: string
          progresso: Json
          relatorio: Json
          staging_path: string | null
          updated_at: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string
          estado?: string
          ficheiro_sha256: string
          id?: string
          manifesto?: Json
          modo: string
          progresso?: Json
          relatorio?: Json
          staging_path?: string | null
          updated_at?: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string
          estado?: string
          ficheiro_sha256?: string
          id?: string
          manifesto?: Json
          modo?: string
          progresso?: Json
          relatorio?: Json
          staging_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nl_noticias: {
        Row: {
          busca: unknown
          categoria: string
          corpo_artigo: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          destino: string
          edicao_id: string | null
          email_assunto: string | null
          email_recebido_id: string | null
          email_remetente: string | null
          embedding: unknown
          estado: string
          fonte_estado: string
          fonte_id: string | null
          fonte_url_original: string | null
          id: string
          ordem: number
          origem: string
          override_destino: string
          repeticao_de: string | null
          repeticao_score: number | null
          repeticao_verificada_em: string | null
          titulo: string
          updated_at: string
          url: string | null
          url_curto: string | null
          url_norm: string | null
        }
        Insert: {
          busca?: unknown
          categoria: string
          corpo_artigo?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          destino?: string
          edicao_id?: string | null
          email_assunto?: string | null
          email_recebido_id?: string | null
          email_remetente?: string | null
          embedding?: unknown
          estado?: string
          fonte_estado?: string
          fonte_id?: string | null
          fonte_url_original?: string | null
          id?: string
          ordem?: number
          origem: string
          override_destino?: string
          repeticao_de?: string | null
          repeticao_score?: number | null
          repeticao_verificada_em?: string | null
          titulo: string
          updated_at?: string
          url?: string | null
          url_curto?: string | null
          url_norm?: string | null
        }
        Update: {
          busca?: unknown
          categoria?: string
          corpo_artigo?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          destino?: string
          edicao_id?: string | null
          email_assunto?: string | null
          email_recebido_id?: string | null
          email_remetente?: string | null
          embedding?: unknown
          estado?: string
          fonte_estado?: string
          fonte_id?: string | null
          fonte_url_original?: string | null
          id?: string
          ordem?: number
          origem?: string
          override_destino?: string
          repeticao_de?: string | null
          repeticao_score?: number | null
          repeticao_verificada_em?: string | null
          titulo?: string
          updated_at?: string
          url?: string | null
          url_curto?: string | null
          url_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_noticias_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_noticias_email_recebido_id_fkey"
            columns: ["email_recebido_id"]
            isOneToOne: false
            referencedRelation: "nl_emails_recebidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_noticias_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "nl_fontes_curadoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_noticias_repeticao_de_fkey"
            columns: ["repeticao_de"]
            isOneToOne: false
            referencedRelation: "nl_noticias"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_prioridades_editoriais: {
        Row: {
          created_at: string
          id: string
          palavra_chave: string
          peso: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          palavra_chave: string
          peso?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          palavra_chave?: string
          peso?: number
          updated_at?: string
        }
        Relationships: []
      }
      nl_revista_edicao: {
        Row: {
          bloco_ferramentas: boolean
          created_at: string
          cronica_excerto: string
          cronica_imagem_alt: string
          cronica_imagem_credito: string
          cronica_imagem_credito_url: string
          cronica_imagem_enquadramento: Json
          cronica_imagem_fonte: string
          cronica_imagem_posicao: number
          cronica_imagem_recorte_url: string
          cronica_imagem_url: string
          cronica_lede: string
          cronica_lede_posicao: number
          cronica_subtitulo: string
          cronica_titulo: string
          cronica_url: string
          edicao_id: string
          livro_activo: boolean
          livro_cta: string
          livro_etiqueta: string
          livro_texto: string
          livro_titulo: string
          livro_url: string
          momento_activo: boolean
          momento_descricao: string
          momento_etiqueta: string
          momento_posicao: number
          momento_valor: string
          podcast_activo: boolean
          podcast_convidado: string
          podcast_cta: string
          podcast_etiqueta: string
          podcast_pergunta: string
          podcast_programa: string
          podcast_tema: string
          podcast_url: string
          preheader: string
          promocao_activa: boolean
          promocao_link_texto: string
          promocao_prefixo: string
          promocao_url: string
          pull_quote: string
          pull_quote_posicao: number
          recomendacao_activa: boolean
          recomendacao_meta: string
          recomendacao_nota: string
          recomendacao_tipo: string
          recomendacao_titulo: string
          recomendacao_url: string
          servicos_activo: boolean
          servicos_auditoria_activo: boolean
          servicos_consultoria_activo: boolean
          servicos_consultoria_cta: string
          servicos_consultoria_texto: string
          servicos_consultoria_url: string
          servicos_cta: string
          servicos_cursos_activo: boolean
          servicos_cursos_cta: string
          servicos_cursos_texto: string
          servicos_cursos_url: string
          servicos_intro: string
          servicos_titulo: string
          servicos_url: string
          updated_at: string
        }
        Insert: {
          bloco_ferramentas?: boolean
          created_at?: string
          cronica_excerto?: string
          cronica_imagem_alt?: string
          cronica_imagem_credito?: string
          cronica_imagem_credito_url?: string
          cronica_imagem_enquadramento?: Json
          cronica_imagem_fonte?: string
          cronica_imagem_posicao?: number
          cronica_imagem_recorte_url?: string
          cronica_imagem_url?: string
          cronica_lede?: string
          cronica_lede_posicao?: number
          cronica_subtitulo?: string
          cronica_titulo?: string
          cronica_url?: string
          edicao_id: string
          livro_activo?: boolean
          livro_cta?: string
          livro_etiqueta?: string
          livro_texto?: string
          livro_titulo?: string
          livro_url?: string
          momento_activo?: boolean
          momento_descricao?: string
          momento_etiqueta?: string
          momento_posicao?: number
          momento_valor?: string
          podcast_activo?: boolean
          podcast_convidado?: string
          podcast_cta?: string
          podcast_etiqueta?: string
          podcast_pergunta?: string
          podcast_programa?: string
          podcast_tema?: string
          podcast_url?: string
          preheader?: string
          promocao_activa?: boolean
          promocao_link_texto?: string
          promocao_prefixo?: string
          promocao_url?: string
          pull_quote?: string
          pull_quote_posicao?: number
          recomendacao_activa?: boolean
          recomendacao_meta?: string
          recomendacao_nota?: string
          recomendacao_tipo?: string
          recomendacao_titulo?: string
          recomendacao_url?: string
          servicos_activo?: boolean
          servicos_auditoria_activo?: boolean
          servicos_consultoria_activo?: boolean
          servicos_consultoria_cta?: string
          servicos_consultoria_texto?: string
          servicos_consultoria_url?: string
          servicos_cta?: string
          servicos_cursos_activo?: boolean
          servicos_cursos_cta?: string
          servicos_cursos_texto?: string
          servicos_cursos_url?: string
          servicos_intro?: string
          servicos_titulo?: string
          servicos_url?: string
          updated_at?: string
        }
        Update: {
          bloco_ferramentas?: boolean
          created_at?: string
          cronica_excerto?: string
          cronica_imagem_alt?: string
          cronica_imagem_credito?: string
          cronica_imagem_credito_url?: string
          cronica_imagem_enquadramento?: Json
          cronica_imagem_fonte?: string
          cronica_imagem_posicao?: number
          cronica_imagem_recorte_url?: string
          cronica_imagem_url?: string
          cronica_lede?: string
          cronica_lede_posicao?: number
          cronica_subtitulo?: string
          cronica_titulo?: string
          cronica_url?: string
          edicao_id?: string
          livro_activo?: boolean
          livro_cta?: string
          livro_etiqueta?: string
          livro_texto?: string
          livro_titulo?: string
          livro_url?: string
          momento_activo?: boolean
          momento_descricao?: string
          momento_etiqueta?: string
          momento_posicao?: number
          momento_valor?: string
          podcast_activo?: boolean
          podcast_convidado?: string
          podcast_cta?: string
          podcast_etiqueta?: string
          podcast_pergunta?: string
          podcast_programa?: string
          podcast_tema?: string
          podcast_url?: string
          preheader?: string
          promocao_activa?: boolean
          promocao_link_texto?: string
          promocao_prefixo?: string
          promocao_url?: string
          pull_quote?: string
          pull_quote_posicao?: number
          recomendacao_activa?: boolean
          recomendacao_meta?: string
          recomendacao_nota?: string
          recomendacao_tipo?: string
          recomendacao_titulo?: string
          recomendacao_url?: string
          servicos_activo?: boolean
          servicos_auditoria_activo?: boolean
          servicos_consultoria_activo?: boolean
          servicos_consultoria_cta?: string
          servicos_consultoria_texto?: string
          servicos_consultoria_url?: string
          servicos_cta?: string
          servicos_cursos_activo?: boolean
          servicos_cursos_cta?: string
          servicos_cursos_texto?: string
          servicos_cursos_url?: string
          servicos_intro?: string
          servicos_titulo?: string
          servicos_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_revista_edicao_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: true
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_revista_itens: {
        Row: {
          created_at: string
          cta_rotulo: string
          edicao_id: string
          id: string
          minha_leitura: string
          noticia_id: string
          ordem: number
          papel: string
          radar_nota: string
          resumo_factual: string
          titulo_override: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_rotulo?: string
          edicao_id: string
          id?: string
          minha_leitura?: string
          noticia_id: string
          ordem?: number
          papel: string
          radar_nota?: string
          resumo_factual?: string
          titulo_override?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_rotulo?: string
          edicao_id?: string
          id?: string
          minha_leitura?: string
          noticia_id?: string
          ordem?: number
          papel?: string
          radar_nota?: string
          resumo_factual?: string
          titulo_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_revista_itens_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_revista_itens_noticia_id_fkey"
            columns: ["noticia_id"]
            isOneToOne: false
            referencedRelation: "nl_noticias"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_secoes_edicao: {
        Row: {
          activo: boolean
          cor: string | null
          created_at: string
          edicao_id: string
          id: string
          ordem: number
          texto: string | null
          texto_botao: string | null
          tipo: string
          titulo: string | null
          url_botao: string | null
        }
        Insert: {
          activo?: boolean
          cor?: string | null
          created_at?: string
          edicao_id: string
          id?: string
          ordem?: number
          texto?: string | null
          texto_botao?: string | null
          tipo: string
          titulo?: string | null
          url_botao?: string | null
        }
        Update: {
          activo?: boolean
          cor?: string | null
          created_at?: string
          edicao_id?: string
          id?: string
          ordem?: number
          texto?: string | null
          texto_botao?: string | null
          tipo?: string
          titulo?: string | null
          url_botao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_secoes_edicao_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_subscricao_eventos: {
        Row: {
          accao: string
          criado_em: string
          detalhe: Json
          edicao_id: string | null
          email: string
          id: string
          lista_egoi_id: string | null
          lista_nome: string | null
          motivo: string | null
          origem: string
          retoma_em: string | null
          retomado_em: string | null
        }
        Insert: {
          accao: string
          criado_em?: string
          detalhe?: Json
          edicao_id?: string | null
          email: string
          id?: string
          lista_egoi_id?: string | null
          lista_nome?: string | null
          motivo?: string | null
          origem?: string
          retoma_em?: string | null
          retomado_em?: string | null
        }
        Update: {
          accao?: string
          criado_em?: string
          detalhe?: Json
          edicao_id?: string | null
          email?: string
          id?: string
          lista_egoi_id?: string | null
          lista_nome?: string | null
          motivo?: string | null
          origem?: string
          retoma_em?: string | null
          retomado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_subscricao_eventos_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "nl_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_user_mapping: {
        Row: {
          created_at: string
          historico: Json
          source_email: string | null
          source_nome: string | null
          source_papel: string | null
          source_user_id: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          historico?: Json
          source_email?: string | null
          source_nome?: string | null
          source_papel?: string | null
          source_user_id: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          historico?: Json
          source_email?: string | null
          source_nome?: string | null
          source_papel?: string | null
          source_user_id?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          origem: Json | null
          platform: string
          project_id: string | null
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
          origem?: Json | null
          platform: string
          project_id?: string | null
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
          origem?: Json | null
          platform?: string
          project_id?: string | null
          publish_immediately?: boolean | null
          raw_transcription?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          use_separate_captions?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      story_link_publications: {
        Row: {
          caption: string | null
          confirmation_token_expires_at: string | null
          confirmation_token_hash: string | null
          created_at: string
          id: string
          last_error: string | null
          link_url: string
          manual_link_clicks: number | null
          manual_metrics_captured_at: string | null
          manual_views: number | null
          media_type: string
          media_url: string
          overlay_text: string | null
          post_id: string | null
          published_at: string | null
          published_by_device: string | null
          reminder_channel: string | null
          reminder_scheduled_at: string | null
          reminder_sent_at: string | null
          status: string
          sticker_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          link_url: string
          manual_link_clicks?: number | null
          manual_metrics_captured_at?: string | null
          manual_views?: number | null
          media_type: string
          media_url: string
          overlay_text?: string | null
          post_id?: string | null
          published_at?: string | null
          published_by_device?: string | null
          reminder_channel?: string | null
          reminder_scheduled_at?: string | null
          reminder_sent_at?: string | null
          status?: string
          sticker_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          link_url?: string
          manual_link_clicks?: number | null
          manual_metrics_captured_at?: string | null
          manual_views?: number | null
          media_type?: string
          media_url?: string
          overlay_text?: string | null
          post_id?: string | null
          published_at?: string | null
          published_by_device?: string | null
          reminder_channel?: string | null
          reminder_scheduled_at?: string | null
          reminder_sent_at?: string | null
          status?: string
          sticker_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_link_publications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
      user_notification_preferences: {
        Row: {
          created_at: string
          email_tested_at: string | null
          push_tested_at: string | null
          quiet_hours_end: string
          quiet_hours_start: string
          reminder_channel: string
          reminder_minutes_before: number
          reminder_telegram_chat_id: string | null
          reminder_weekdays: number[]
          reminder_whatsapp_number: string | null
          telegram_tested_at: string | null
          updated_at: string
          user_id: string
          whatsapp_tested_at: string | null
        }
        Insert: {
          created_at?: string
          email_tested_at?: string | null
          push_tested_at?: string | null
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_channel?: string
          reminder_minutes_before?: number
          reminder_telegram_chat_id?: string | null
          reminder_weekdays?: number[]
          reminder_whatsapp_number?: string | null
          telegram_tested_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp_tested_at?: string | null
        }
        Update: {
          created_at?: string
          email_tested_at?: string | null
          push_tested_at?: string | null
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_channel?: string
          reminder_minutes_before?: number
          reminder_telegram_chat_id?: string | null
          reminder_weekdays?: number[]
          reminder_whatsapp_number?: string | null
          telegram_tested_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_tested_at?: string | null
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
      nl_perfis: {
        Row: {
          id: string | null
          nome: string | null
          papel: string | null
        }
        Insert: {
          id?: string | null
          nome?: never
          papel?: never
        }
        Update: {
          id?: string | null
          nome?: never
          papel?: never
        }
        Relationships: []
      }
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
      confirm_story_link_publication: {
        Args: {
          _action: string
          _device?: string
          _story_id: string
          _token: string
        }
        Returns: boolean
      }
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
      nl_contar_dados_antigos: { Args: { _dias?: number }; Returns: Json }
      nl_criar_seccoes_padrao: {
        Args: { _edicao_id: string }
        Returns: undefined
      }
      nl_encontrar_candidatos_repeticao: {
        Args: { _categoria: string; _limiar?: number; _titulo: string }
        Returns: {
          created_at: string
          edicao_id: string
          edicao_numero: number
          id: string
          score: number
          titulo: string
        }[]
      }
      nl_f_unaccent: { Args: { "": string }; Returns: string }
      nl_import_existentes: {
        Args: { _ids: string[]; _pk: string; _tabela: string }
        Returns: string[]
      }
      nl_import_reescrever_url: {
        Args: { _antigo: string; _novo: string }
        Returns: Json
      }
      nl_import_relatorio: { Args: never; Returns: Json }
      nl_import_repeticoes: { Args: { _pares: Json }; Returns: Json }
      nl_import_rows: {
        Args: { _linhas: Json; _tabela: string }
        Returns: Json
      }
      nl_import_suspender_agendamentos: { Args: never; Returns: Json }
      nl_is_admin: { Args: never; Returns: boolean }
      nl_is_service: { Args: never; Returns: boolean }
      nl_is_staff: { Args: never; Returns: boolean }
      nl_limpar_dados_antigos: { Args: { _dias?: number }; Returns: Json }
      nl_mapear_perfil: {
        Args: { _source: string; _target: string }
        Returns: undefined
      }
      nl_me_papel: { Args: never; Returns: string }
      nl_mover_seccao: {
        Args: { _direccao: string; _seccao_id: string }
        Returns: undefined
      }
      nl_normalizar_url_sql: { Args: { _url: string }; Returns: string }
      nl_pesquisar_arquivo: {
        Args: { limite?: number; query: string }
        Returns: {
          edicao_data: string
          edicao_id: string
          edicao_numero: number
          rank: number
          tipo: string
          titulo: string
          trecho: string
          url: string
        }[]
      }
      nl_pesquisar_global: {
        Args: {
          ambitos?: string[]
          edicao_actual?: string
          limite?: number
          query: string
        }
        Returns: {
          ambito: string
          categoria: string
          criado_em: string
          edicao_data: string
          edicao_id: string
          edicao_numero: number
          estado: string
          id: string
          origem: string
          rank: number
          tipo: string
          titulo: string
          trecho: string
          url: string
          usada_em_numero: number
        }[]
      }
      nl_registar_evento_brief: {
        Args: { _edicao_numero: number; _evento: string; _slug: string }
        Returns: undefined
      }
      nl_reordenar_noticias: {
        Args: { _edicao_id: string; _ids: string[] }
        Returns: undefined
      }
      nl_reordenar_seccoes: {
        Args: { _edicao_id: string; _ids: string[] }
        Returns: undefined
      }
      nl_reservar_jobs_conteudos: {
        Args: { _limite: number }
        Returns: {
          actualizado_em: string
          campanhas: Json
          confirmado_em: string | null
          conteudo_id: string
          created_at: string
          edicao_id: string
          erro: string | null
          estado: string
          fonte_hash: string
          id: string
          max_tentativas: number
          origem: string
          proxima_tentativa_em: string
          reservado_ate: string | null
          tentativas: number
          tipo: string
        }[]
        SetofOptions: {
          from: "*"
          to: "nl_conteudos_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      nl_stats_fontes_30d: {
        Args: never
        Returns: {
          aprovadas_30d: number
          fonte_id: string
          sugeridas_30d: number
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
