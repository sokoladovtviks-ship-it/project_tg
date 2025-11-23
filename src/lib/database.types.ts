export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          icon: string | null;
          image_url: string | null;
          is_visible: boolean;
          order_position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          icon?: string | null;
          image_url?: string | null;
          is_visible?: boolean;
          order_position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          icon?: string | null;
          image_url?: string | null;
          is_visible?: boolean;
          order_position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          stock_quantity: number;
          images_urls: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          stock_quantity?: number;
          images_urls?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          stock_quantity?: number;
          images_urls?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          user_id: string | null;
          status: 'new' | 'processing' | 'delivering' | 'completed' | 'cancelled';
          total_amount: number;
          delivery_method: string | null;
          payment_method: string | null;
          delivery_address: string | null;
          phone: string | null;
          notes: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id?: string | null;
          status?: 'new' | 'processing' | 'delivering' | 'completed' | 'cancelled';
          total_amount: number;
          delivery_method?: string | null;
          payment_method?: string | null;
          delivery_address?: string | null;
          phone?: string | null;
          notes?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string | null;
          status?: 'new' | 'processing' | 'delivering' | 'completed' | 'cancelled';
          total_amount?: number;
          delivery_method?: string | null;
          payment_method?: string | null;
          delivery_address?: string | null;
          phone?: string | null;
          notes?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          currency: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          currency?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          currency?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      admins: {
        Row: {
          id: string;
          store_id: string;
          telegram_user_id: number;
          telegram_username: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          telegram_user_id: number;
          telegram_username?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          telegram_user_id?: number;
          telegram_username?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_accounts: {
        Row: {
          id: string;
          product_id: string;
          account_login: string;
          account_password: string;
          is_sold: boolean;
          order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          account_login: string;
          account_password: string;
          is_sold?: boolean;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          account_login?: string;
          account_password?: string;
          is_sold?: boolean;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}