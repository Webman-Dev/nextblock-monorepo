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
          is_default: boolean
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          is_default?: boolean
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          is_default?: boolean
          is_active?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_claim: {
        Args: { claim: string }
        Returns: string
      }
    }
    Enums: {
      menu_location: "HEADER" | "FOOTER" | "SIDEBAR"
      page_status: "draft" | "published" | "archived"
      user_role: "ADMIN" | "WRITER" | "USER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      menu_location: ["HEADER", "FOOTER", "SIDEBAR"],
      page_status: ["draft", "published", "archived"],
      user_role: ["ADMIN", "WRITER", "USER"],
    },
  },
} as const
