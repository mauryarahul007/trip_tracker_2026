// Hand-written mirror of supabase/migrations/0001_init.sql.
// Once a real project exists, prefer regenerating this with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          banned: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<{
          display_name: string | null;
          avatar_url: string | null;
        }>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          base_currency: string;
          owner_id: string;
          join_code: string;
          archived: boolean;
          frozen: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          base_currency?: string;
          owner_id: string;
          join_code?: string;
          archived?: boolean;
          frozen?: boolean;
        };
        Update: Partial<{
          name: string;
          start_date: string;
          end_date: string;
          base_currency: string;
          archived: boolean;
          frozen: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          archived: boolean;
          linked_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          archived?: boolean;
          linked_user_id?: string;
        };
        Update: Partial<{
          name: string;
          archived: boolean;
          linked_user_id: string | null;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'members_linked_user_id_fkey';
            columns: ['linked_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
        };
        Update: Partial<{ name: string; updated_at: string }>;
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; member_id: string };
        Insert: { group_id: string; member_id: string };
        Update: Partial<{ group_id: string; member_id: string }>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          icon: string | null;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          icon?: string | null;
          is_custom?: boolean;
        };
        Update: Partial<{ name: string; icon: string | null }>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          amount: number;
          currency: string;
          category: string;
          date: string;
          paid_by: string;
          split_mode: 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage';
          split_member_ids: string[];
          split_config: Record<string, number> | null;
          resolved_shares: Record<string, number>;
          receipt_path: string | null;
          is_settlement: boolean;
          created_by_user_id: string;
          location?: { lat: number; lng: number; placeName?: string } | null;
          deleted_at: string | null;
          deleted_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          amount: number;
          currency: string;
          category: string;
          date: string;
          paid_by: string;
          split_mode: 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage';
          split_member_ids: string[];
          split_config?: Record<string, number> | null;
          resolved_shares: Record<string, number>;
          receipt_path?: string | null;
          location?: { lat: number; lng: number; placeName?: string } | null;
          is_settlement?: boolean;
          created_by_user_id: string;
        };
        Update: Partial<{
          title: string;
          amount: number;
          currency: string;
          category: string;
          date: string;
          paid_by: string;
          split_mode: 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage';
          split_member_ids: string[];
          split_config: Record<string, number> | null;
          resolved_shares: Record<string, number>;
          receipt_path: string | null;
          location: { lat: number; lng: number; placeName?: string } | null;
          deleted_at: string | null;
          deleted_by_user_id: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      device_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          platform: 'ios' | 'android';
          fcm_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: 'ios' | 'android';
          fcm_token: string;
        };
        Update: Partial<{
          platform: 'ios' | 'android';
          fcm_token: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'device_push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          title: string;
          body: string;
          data: Record<string, string> | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          title: string;
          body: string;
          data?: Record<string, string> | null;
          read?: boolean;
        };
        Update: Partial<{
          read: boolean;
        }>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      bugs: {
        Row: {
          id: string;
          title: string;
          description: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          category:
            | 'offline-sync'
            | 'splits-math'
            | 'ui-ux'
            | 'navigation'
            | 'auth'
            | 'receipts-camera'
            | 'p2p-sync'
            | 'performance'
            | 'general';
          status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
          found_by: string;
          environment: {
            platform: 'web' | 'android' | 'ios';
            browser?: string;
            isOnline: boolean;
            appVersion: string;
            route?: string;
          };
          repro_steps: string[];
          expected_behavior: string;
          actual_behavior: string;
          diagnostics: {
            stackTrace?: string;
            consoleLogs?: string[];
            syncQueueLength?: number;
            activeTripId?: string;
          } | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_note: string | null;
        };
        Insert: {
          id: string;
          title: string;
          description?: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          category:
            | 'offline-sync'
            | 'splits-math'
            | 'ui-ux'
            | 'navigation'
            | 'auth'
            | 'receipts-camera'
            | 'p2p-sync'
            | 'performance'
            | 'general';
          status?: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
          found_by?: string;
          environment?: {
            platform: 'web' | 'android' | 'ios';
            browser?: string;
            isOnline: boolean;
            appVersion: string;
            route?: string;
          };
          repro_steps?: string[];
          expected_behavior?: string;
          actual_behavior?: string;
          diagnostics?: {
            stackTrace?: string;
            consoleLogs?: string[];
            syncQueueLength?: number;
            activeTripId?: string;
          } | null;
        };
        Update: Partial<{
          title: string;
          description: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          category:
            | 'offline-sync'
            | 'splits-math'
            | 'ui-ux'
            | 'navigation'
            | 'auth'
            | 'receipts-camera'
            | 'p2p-sync'
            | 'performance'
            | 'general';
          status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
          resolved_by: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      security_audit_logs: {
        Row: {
          id: string;
          trip_id: string | null;
          actor_user_id: string | null;
          action: string;
          details: unknown;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feature_flag_overrides: {
        Row: {
          scope: 'global' | 'trip' | 'user';
          scope_id: string;
          flag_key: string;
          value: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      features: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: 'ui-ux' | 'analytics' | 'admin' | 'sync' | 'notifications' | 'security' | 'performance' | 'native' | 'general';
          status: 'requested' | 'planned' | 'in_progress' | 'shipped' | 'wont_do';
          requested_by: string;
          environment: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          shipped_at: string | null;
          shipped_by: string | null;
          shipped_note: string | null;
          linked_flag_key: string | null;
        };
        Insert: {
          id: string;
          title: string;
          description?: string;
          category: 'ui-ux' | 'analytics' | 'admin' | 'sync' | 'notifications' | 'security' | 'performance' | 'native' | 'general';
          status?: 'requested' | 'planned' | 'in_progress' | 'shipped' | 'wont_do';
          requested_by?: string;
          environment?: Record<string, unknown>;
        };
        Update: Partial<{
          title: string;
          description: string;
          category: 'ui-ux' | 'analytics' | 'admin' | 'sync' | 'notifications' | 'security' | 'performance' | 'native' | 'general';
          status: 'requested' | 'planned' | 'in_progress' | 'shipped' | 'wont_do';
          updated_at: string;
          shipped_at: string | null;
          shipped_by: string | null;
          shipped_note: string | null;
          linked_flag_key: string | null;
        }>;
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: unknown;
          updated_by?: string | null;
        };
        Update: Partial<{
          value: unknown;
          updated_at: string;
          updated_by: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_trip_by_join_code: {
        Args: { p_code: string };
        Returns: {
          trip_id: string;
          trip_name: string;
          is_admin: boolean;
          my_member_id: string | null;
          member_id: string | null;
          member_name: string | null;
        }[];
      };
      claim_trip_member: {
        Args: { p_member_id: string };
        Returns: boolean;
      };
      is_superadmin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      report_bug: {
        Args: {
          p_title: string;
          p_description: string;
          p_severity: string;
          p_category: string;
          p_found_by: string;
          p_environment: Record<string, unknown>;
          p_repro_steps: string[];
          p_expected_behavior: string;
          p_actual_behavior: string;
          p_diagnostics: Record<string, unknown>;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          category:
            | 'offline-sync'
            | 'splits-math'
            | 'ui-ux'
            | 'navigation'
            | 'auth'
            | 'receipts-camera'
            | 'p2p-sync'
            | 'performance'
            | 'general';
          status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
          found_by: string;
          environment: {
            platform: 'web' | 'android' | 'ios';
            browser?: string;
            isOnline: boolean;
            appVersion: string;
            route?: string;
          };
          repro_steps: string[];
          expected_behavior: string;
          actual_behavior: string;
          diagnostics: {
            stackTrace?: string;
            consoleLogs?: string[];
            syncQueueLength?: number;
            activeTripId?: string;
          } | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_note: string | null;
        };
      };
      set_user_banned: {
        Args: { p_user_id: string; p_banned: boolean };
        Returns: void;
      };
      get_app_config: {
        Args: Record<string, never>;
        Returns: { key: string; value: unknown; updated_at: string; updated_by: string | null }[];
      };
      set_app_config: {
        Args: { p_key: string; p_value: unknown };
        Returns: { key: string; value: unknown; updated_at: string; updated_by: string | null };
      };
      get_app_flag: {
        Args: { p_key: string };
        Returns: unknown;
      };
      broadcast_notification: {
        Args: { p_title: string; p_body: string; p_trip_id?: string | null };
        Returns: number;
      };
      purge_recycle_bin_older_than: {
        Args: { p_days?: number };
        Returns: number;
      };
      get_superadmin_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      submit_feature_request: {
        Args: {
          p_title: string;
          p_description: string;
          p_category: string;
          p_requested_by: string;
          p_environment: Record<string, unknown>;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          category: 'ui-ux' | 'analytics' | 'admin' | 'sync' | 'notifications' | 'security' | 'performance' | 'native' | 'general';
          status: 'requested' | 'planned' | 'in_progress' | 'shipped' | 'wont_do';
          requested_by: string;
          environment: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          shipped_at: string | null;
          shipped_by: string | null;
          shipped_note: string | null;
          linked_flag_key: string | null;
        };
      };
      get_resolved_feature_flags: {
        Args: { p_trip_id?: string | null };
        Returns: { global: Record<string, boolean>; trip: Record<string, boolean>; user: Record<string, boolean> };
      };
      get_all_feature_flag_overrides: {
        Args: Record<string, never>;
        Returns: { scope: 'global' | 'trip' | 'user'; scope_id: string; flag_key: string; value: boolean; updated_at: string; updated_by: string | null }[];
      };
      set_feature_flag_override: {
        Args: { p_scope: string; p_scope_id: string; p_flag_key: string; p_value: boolean | null };
        Returns: void;
      };
      get_notification_stats: {
        Args: Record<string, never>;
        Returns: { total_count: number; read_count: number; last_7d_count: number }[];
      };
      count_recycled_expenses: {
        Args: Record<string, never>;
        Returns: number;
      };
      purge_audit_logs_older_than: {
        Args: { p_days?: number };
        Returns: number;
      };
      log_security_event: {
        Args: { p_trip_id: string | null; p_action: string; p_details?: Record<string, unknown> };
        Returns: void;
      };
    };
  };
}
