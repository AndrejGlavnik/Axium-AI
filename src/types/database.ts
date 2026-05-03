export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type WorkspaceRole = "owner" | "admin" | "member";
export type ChatRole = "user" | "assistant" | "system";
export type FileStatus = "stored" | "indexing" | "ready" | "failed" | "openai_skipped";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          openai_vector_store_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          openai_vector_store_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          openai_vector_store_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          role?: WorkspaceRole;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          workspace_id: string;
          uploaded_by: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          openai_file_id: string | null;
          vector_store_id: string | null;
          status: FileStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          uploaded_by: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          openai_file_id?: string | null;
          vector_store_id?: string | null;
          status?: FileStatus;
          created_at?: string;
        };
        Update: {
          openai_file_id?: string | null;
          vector_store_id?: string | null;
          status?: FileStatus;
        };
        Relationships: [];
      };
      file_schemas: {
        Row: {
          id: string;
          file_id: string;
          workspace_id: string;
          columns: Json;
          row_count: number;
          sample_rows: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          workspace_id: string;
          columns: Json;
          row_count: number;
          sample_rows?: Json;
          created_at?: string;
        };
        Update: {
          columns?: Json;
          row_count?: number;
          sample_rows?: Json;
        };
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          workspace_id: string;
          thread_id: string;
          role: ChatRole;
          content: string;
          sources: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          thread_id: string;
          role: ChatRole;
          content: string;
          sources?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          sources?: Json | null;
        };
        Relationships: [];
      };
      analysis_runs: {
        Row: {
          id: string;
          workspace_id: string;
          file_id: string | null;
          run_type: string;
          parameters: Json;
          result: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          file_id?: string | null;
          run_type: string;
          parameters?: Json;
          result?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: {
        Args: {
          target_workspace_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type WorkspaceFile = Database["public"]["Tables"]["files"]["Row"];
export type FileSchema = Database["public"]["Tables"]["file_schemas"]["Row"];
export type ChatThread = Database["public"]["Tables"]["chat_threads"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
