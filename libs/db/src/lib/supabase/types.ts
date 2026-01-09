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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          block_type: string
          content: Json | null
          created_at: string
          id: number
          language_id: number
          order: number
          page_id: number | null
          post_id: number | null
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json | null
          created_at?: string
          id?: number
          language_id: number
          order?: number
          page_id?: number | null
          post_id?: number | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json | null
          created_at?: string
          id?: number
          language_id?: number
          order?: number
          page_id?: number | null
          post_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          id: number
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      logos: {
        Row: {
          created_at: string
          id: string
          media_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "logos_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          blur_data_url: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string | null
          file_type: string | null
          folder: string | null
          height: number | null
          id: string
          object_key: string
          size_bytes: number | null
          updated_at: string
          uploader_id: string | null
          variants: Json | null
          width: number | null
        }
        Insert: {
          blur_data_url?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path?: string | null
          file_type?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          object_key: string
          size_bytes?: number | null
          updated_at?: string
          uploader_id?: string | null
          variants?: Json | null
          width?: number | null
        }
        Update: {
          blur_data_url?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string | null
          file_type?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          object_key?: string
          size_bytes?: number | null
          updated_at?: string
          uploader_id?: string | null
          variants?: Json | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          created_at: string
          id: number
          label: string
          language_id: number
          menu_key: Database["public"]["Enums"]["menu_location"]
          order: number
          page_id: number | null
          parent_id: number | null
          translation_group_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          language_id: number
          menu_key: Database["public"]["Enums"]["menu_location"]
          order?: number
          page_id?: number | null
          parent_id?: number | null
          translation_group_id?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          language_id?: number
          menu_key?: Database["public"]["Enums"]["menu_location"]
          order?: number
          page_id?: number | null
          parent_id?: number | null
          translation_group_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      page_revisions: {
        Row: {
          author_id: string | null
          content: Json
          created_at: string
          id: number
          page_id: number
          revision_type: Database["public"]["Enums"]["revision_type"]
          version: number
        }
        Insert: {
          author_id?: string | null
          content: Json
          created_at?: string
          id?: number
          page_id: number
          revision_type: Database["public"]["Enums"]["revision_type"]
          version: number
        }
        Update: {
          author_id?: string | null
          content?: Json
          created_at?: string
          id?: number
          page_id?: number
          revision_type?: Database["public"]["Enums"]["revision_type"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_revisions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          author_id: string | null
          created_at: string
          id: number
          language_id: number
          meta_description: string | null
          meta_title: string | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          title: string
          translation_group_id: string
          updated_at: string
          version: number
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: number
          language_id: number
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          translation_group_id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: number
          language_id?: number
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          translation_group_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      post_revisions: {
        Row: {
          author_id: string | null
          content: Json
          created_at: string
          id: number
          post_id: number
          revision_type: Database["public"]["Enums"]["revision_type"]
          version: number
        }
        Insert: {
          author_id?: string | null
          content: Json
          created_at?: string
          id?: number
          post_id: number
          revision_type: Database["public"]["Enums"]["revision_type"]
          version: number
        }
        Update: {
          author_id?: string | null
          content?: Json
          created_at?: string
          id?: number
          post_id?: number
          revision_type?: Database["public"]["Enums"]["revision_type"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          created_at: string
          excerpt: string | null
          feature_image_id: string | null
          id: number
          language_id: number
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          title: string
          translation_group_id: string
          updated_at: string
          version: number
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          excerpt?: string | null
          feature_image_id?: string | null
          id?: number
          language_id: number
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          translation_group_id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          author_id?: string | null
          created_at?: string
          excerpt?: string | null
          feature_image_id?: string | null
          id?: number
          language_id?: number
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          translation_group_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_feature_image"
            columns: ["feature_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          value: Json | null
        }
        Insert: {
          key: string
          value?: Json | null
        }
        Update: {
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          key: string
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          key: string
          translations: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          key?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_claim: { Args: { claim: string }; Returns: string }
      get_my_role: { Args: never; Returns: string }
    }
    Enums: {
      menu_location: "HEADER" | "FOOTER" | "SIDEBAR"
      page_status: "draft" | "published" | "archived"
      revision_type: "snapshot" | "diff"
      user_role: "ADMIN" | "WRITER" | "USER"
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
      menu_location: ["HEADER", "FOOTER", "SIDEBAR"],
      page_status: ["draft", "published", "archived"],
      revision_type: ["snapshot", "diff"],
      user_role: ["ADMIN", "WRITER", "USER"],
    },
  },
} as const
