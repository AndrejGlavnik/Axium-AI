import type {
  ConnectionAuthType,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionType,
  SyncFrequency
} from "@/lib/connections/constants";
import type {
  AggregationType,
  CatalogStatus,
  ConfidenceLevel,
  CrossReferenceJoinType,
  DataAssetStatus,
  DataAssetType,
  FieldType,
  JoinQuality,
  KnowledgeEntryStatus,
  KnowledgeEntryType,
  MetricGrain,
  PiiLevel,
  RelationshipNodeType,
  RelationshipType,
  SourceOfTruthLevel,
  SourcePlatform
} from "@/lib/knowledge/constants";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";
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
          updated_at: string;
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
          updated_at?: string;
        };
        Update: {
          openai_file_id?: string | null;
          vector_store_id?: string | null;
          status?: FileStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      file_schemas: {
        Row: {
          id: string;
          file_id: string;
          workspace_id: string;
          columns: Json;
          detected_columns: string[];
          detected_date_columns: string[];
          detected_metric_columns: string[];
          detected_dimension_columns: string[];
          row_count: number;
          sample_rows: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          workspace_id: string;
          columns?: Json;
          detected_columns?: string[];
          detected_date_columns?: string[];
          detected_metric_columns?: string[];
          detected_dimension_columns?: string[];
          row_count?: number;
          sample_rows?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          columns?: Json;
          detected_columns?: string[];
          detected_date_columns?: string[];
          detected_metric_columns?: string[];
          detected_dimension_columns?: string[];
          row_count?: number;
          sample_rows?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          created_by: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string;
          created_by?: string;
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
          user_id: string | null;
          question: string | null;
          files_used: Json;
          knowledge_used: Json;
          output_type: string | null;
          file_id: string | null;
          run_type: string | null;
          parameters: Json;
          result: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          question?: string | null;
          files_used?: Json;
          knowledge_used?: Json;
          output_type?: string | null;
          file_id?: string | null;
          run_type?: string | null;
          parameters?: Json;
          result?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      knowledge_entries: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          title: string;
          type: KnowledgeEntryType;
          description: string;
          affected_system: string | null;
          affected_dashboard: string | null;
          affected_metric: string | null;
          affected_date_start: string | null;
          affected_date_end: string | null;
          root_cause: string | null;
          business_impact: string | null;
          recommended_action: string | null;
          status: KnowledgeEntryStatus;
          confidence_level: ConfidenceLevel;
          tags: string[];
          source_file_id: string | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          title: string;
          type?: KnowledgeEntryType;
          description: string;
          affected_system?: string | null;
          affected_dashboard?: string | null;
          affected_metric?: string | null;
          affected_date_start?: string | null;
          affected_date_end?: string | null;
          root_cause?: string | null;
          business_impact?: string | null;
          recommended_action?: string | null;
          status?: KnowledgeEntryStatus;
          confidence_level?: ConfidenceLevel;
          tags?: string[];
          source_file_id?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_entries"]["Insert"]>;
        Relationships: [];
      };
      data_assets: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          asset_name: string;
          asset_type: DataAssetType;
          source_platform: SourcePlatform;
          description: string | null;
          owner: string | null;
          refresh_frequency: string | null;
          refresh_method: string | null;
          source_of_truth_level: SourceOfTruthLevel;
          status: DataAssetStatus;
          known_limitations: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          asset_name: string;
          asset_type?: DataAssetType;
          source_platform?: SourcePlatform;
          description?: string | null;
          owner?: string | null;
          refresh_frequency?: string | null;
          refresh_method?: string | null;
          source_of_truth_level?: SourceOfTruthLevel;
          status?: DataAssetStatus;
          known_limitations?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["data_assets"]["Insert"]>;
        Relationships: [];
      };
      metrics_catalog: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          metric_name: string;
          business_definition: string;
          technical_definition: string | null;
          formula: string | null;
          source_asset_id: string | null;
          source_field_name: string | null;
          aggregation_type: AggregationType;
          grain: MetricGrain;
          owner: string | null;
          status: CatalogStatus;
          known_issues: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          metric_name: string;
          business_definition: string;
          technical_definition?: string | null;
          formula?: string | null;
          source_asset_id?: string | null;
          source_field_name?: string | null;
          aggregation_type?: AggregationType;
          grain?: MetricGrain;
          owner?: string | null;
          status?: CatalogStatus;
          known_issues?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["metrics_catalog"]["Insert"]>;
        Relationships: [];
      };
      fields_catalog: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          field_name: string;
          field_type: FieldType;
          source_asset_id: string | null;
          description: string | null;
          example_values: string[];
          can_be_used_for_join: boolean;
          join_quality: JoinQuality;
          pii_level: PiiLevel;
          status: CatalogStatus;
          known_issues: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          field_name: string;
          field_type?: FieldType;
          source_asset_id?: string | null;
          description?: string | null;
          example_values?: string[];
          can_be_used_for_join?: boolean;
          join_quality?: JoinQuality;
          pii_level?: PiiLevel;
          status?: CatalogStatus;
          known_issues?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fields_catalog"]["Insert"]>;
        Relationships: [];
      };
      knowledge_relationships: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          from_type: RelationshipNodeType;
          from_id: string;
          to_type: RelationshipNodeType;
          to_id: string;
          relationship_type: RelationshipType;
          description: string | null;
          confidence_level: ConfidenceLevel;
          status: CatalogStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          from_type: RelationshipNodeType;
          from_id: string;
          to_type: RelationshipNodeType;
          to_id: string;
          relationship_type?: RelationshipType;
          description?: string | null;
          confidence_level?: ConfidenceLevel;
          status?: CatalogStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_relationships"]["Insert"]>;
        Relationships: [];
      };
      cross_reference_rules: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          rule_name: string;
          primary_asset_id: string;
          secondary_asset_id: string;
          join_field_primary: string;
          join_field_secondary: string;
          join_type: CrossReferenceJoinType;
          join_quality: JoinQuality;
          use_case: string | null;
          warning: string | null;
          status: CatalogStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          rule_name: string;
          primary_asset_id: string;
          secondary_asset_id: string;
          join_field_primary: string;
          join_field_secondary: string;
          join_type?: CrossReferenceJoinType;
          join_quality?: JoinQuality;
          use_case?: string | null;
          warning?: string | null;
          status?: CatalogStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cross_reference_rules"]["Insert"]>;
        Relationships: [];
      };
      connections: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          name: string;
          provider: ConnectionProvider;
          connection_type: ConnectionType;
          auth_type: ConnectionAuthType;
          status: ConnectionStatus;
          base_url: string | null;
          account_identifier: string | null;
          documentation_url: string | null;
          description: string | null;
          owner: string | null;
          sync_frequency: SyncFrequency;
          scopes: string[];
          linked_asset_ids: string[];
          has_credentials: boolean;
          last_sync_at: string | null;
          last_tested_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          name: string;
          provider?: ConnectionProvider;
          connection_type?: ConnectionType;
          auth_type?: ConnectionAuthType;
          status?: ConnectionStatus;
          base_url?: string | null;
          account_identifier?: string | null;
          documentation_url?: string | null;
          description?: string | null;
          owner?: string | null;
          sync_frequency?: SyncFrequency;
          scopes?: string[];
          linked_asset_ids?: string[];
          has_credentials?: boolean;
          last_sync_at?: string | null;
          last_tested_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["connections"]["Insert"]>;
        Relationships: [];
      };
      connection_secrets: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string;
          created_by: string;
          secret_label: string;
          secret_hint: string | null;
          encrypted_payload: string;
          secret_iv: string;
          secret_tag: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id: string;
          created_by: string;
          secret_label?: string;
          secret_hint?: string | null;
          encrypted_payload: string;
          secret_iv: string;
          secret_tag: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["connection_secrets"]["Insert"]>;
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
      is_workspace_writer: {
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
export type KnowledgeEntry = Database["public"]["Tables"]["knowledge_entries"]["Row"];
export type DataAsset = Database["public"]["Tables"]["data_assets"]["Row"];
export type MetricCatalogItem = Database["public"]["Tables"]["metrics_catalog"]["Row"];
export type FieldCatalogItem = Database["public"]["Tables"]["fields_catalog"]["Row"];
export type KnowledgeRelationship = Database["public"]["Tables"]["knowledge_relationships"]["Row"];
export type CrossReferenceRule = Database["public"]["Tables"]["cross_reference_rules"]["Row"];
export type Connection = Database["public"]["Tables"]["connections"]["Row"];
