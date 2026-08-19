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
        };
        Update: Partial<{
          name: string;
          start_date: string;
          end_date: string;
          base_currency: string;
          archived: boolean;
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
    };
  };
}
