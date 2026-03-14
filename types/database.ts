export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      inventories: {
        Row: {
          id: string
          vehicle_code: string
          management_number: string | null
          vin: string | null
          maker: string | null
          car_name: string | null
          grade: string | null
          grade_notes: string | null
          year: number | null
          year_month: number | null
          year_display: string | null
          color: string | null
          inspection: string | null
          price_body: number | null
          price_total: number | null
          price_initial: number | null
          price_body_display: string | null
          price_total_display: string | null
          mileage: number | null
          mileage_display: string | null
          mileage_numeric: number | null
          status: string | null
          publication_status: string | null
          stock_status: string | null
          unpublished_reason: string | null
          stock_date: string | null
          published_date: string | null
          days_listed: number | null
          days_listed_numeric: number | null
          plan_count: number | null
          plan_a: string | null
          plan_b: string | null
          image_count: number | null
          caption_count: number | null
          comment1: string | null
          comment2: string | null
          expanded_frame: string | null
          other_media_status: string | null
          certification_status: string | null
          rating_overall: string | null
          rating_interior: string | null
          rating_exterior: string | null
          evaluation_expiry: string | null
          evaluation_published: string | null
          registered_date: string | null
          updated_date: string | null
          reused_vehicle: string | null
          reused_days_remaining: number | null
          price_review: string | null
          inspection_request: string | null
          detail_views: number | null
          email_inquiries: number | null
          phone_inquiries: number | null
          map_views: number | null
          favorites: number | null
          scraped_at: string | null
          main_image_url: string | null
          image_urls: string[] | null
          images_scraped_at: string | null
          inserted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_code: string
          management_number?: string | null
          vin?: string | null
          maker?: string | null
          car_name?: string | null
          grade?: string | null
          grade_notes?: string | null
          year?: number | null
          year_month?: number | null
          year_display?: string | null
          color?: string | null
          inspection?: string | null
          price_body?: number | null
          price_total?: number | null
          price_initial?: number | null
          price_body_display?: string | null
          price_total_display?: string | null
          mileage?: number | null
          mileage_display?: string | null
          mileage_numeric?: number | null
          status?: string | null
          publication_status?: string | null
          stock_status?: string | null
          unpublished_reason?: string | null
          stock_date?: string | null
          published_date?: string | null
          days_listed?: number | null
          days_listed_numeric?: number | null
          plan_count?: number | null
          plan_a?: string | null
          plan_b?: string | null
          image_count?: number | null
          caption_count?: number | null
          comment1?: string | null
          comment2?: string | null
          expanded_frame?: string | null
          other_media_status?: string | null
          certification_status?: string | null
          rating_overall?: string | null
          rating_interior?: string | null
          rating_exterior?: string | null
          evaluation_expiry?: string | null
          evaluation_published?: string | null
          registered_date?: string | null
          updated_date?: string | null
          reused_vehicle?: string | null
          reused_days_remaining?: number | null
          price_review?: string | null
          inspection_request?: string | null
          detail_views?: number | null
          email_inquiries?: number | null
          phone_inquiries?: number | null
          map_views?: number | null
          favorites?: number | null
          scraped_at?: string | null
          inserted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_code?: string
          management_number?: string | null
          vin?: string | null
          maker?: string | null
          car_name?: string | null
          grade?: string | null
          grade_notes?: string | null
          year?: number | null
          year_month?: number | null
          year_display?: string | null
          color?: string | null
          inspection?: string | null
          price_body?: number | null
          price_total?: number | null
          price_initial?: number | null
          price_body_display?: string | null
          price_total_display?: string | null
          mileage?: number | null
          mileage_display?: string | null
          mileage_numeric?: number | null
          status?: string | null
          publication_status?: string | null
          stock_status?: string | null
          unpublished_reason?: string | null
          stock_date?: string | null
          published_date?: string | null
          days_listed?: number | null
          days_listed_numeric?: number | null
          plan_count?: number | null
          plan_a?: string | null
          plan_b?: string | null
          image_count?: number | null
          caption_count?: number | null
          comment1?: string | null
          comment2?: string | null
          expanded_frame?: string | null
          other_media_status?: string | null
          certification_status?: string | null
          rating_overall?: string | null
          rating_interior?: string | null
          rating_exterior?: string | null
          evaluation_expiry?: string | null
          evaluation_published?: string | null
          registered_date?: string | null
          updated_date?: string | null
          reused_vehicle?: string | null
          reused_days_remaining?: number | null
          price_review?: string | null
          inspection_request?: string | null
          detail_views?: number | null
          email_inquiries?: number | null
          phone_inquiries?: number | null
          map_views?: number | null
          favorites?: number | null
          scraped_at?: string | null
          main_image_url?: string | null
          image_urls?: string[] | null
          images_scraped_at?: string | null
          inserted_at?: string
          updated_at?: string
        }
      }
      inventory_metrics: {
        Row: {
          id: string
          inventory_id: string
          calculated_at: string
          stagnation_days: number | null
          cvr: number | null
          rotation_score: number | null
          discount_flag: boolean | null
          views_count: number | null
          inquiry_count: number | null
          price_change_count: number | null
          days_since_price_change: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          inventory_id: string
          calculated_at?: string
          stagnation_days?: number | null
          cvr?: number | null
          rotation_score?: number | null
          discount_flag?: boolean | null
          views_count?: number | null
          inquiry_count?: number | null
          price_change_count?: number | null
          days_since_price_change?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string
          calculated_at?: string
          stagnation_days?: number | null
          cvr?: number | null
          rotation_score?: number | null
          discount_flag?: boolean | null
          views_count?: number | null
          inquiry_count?: number | null
          price_change_count?: number | null
          days_since_price_change?: number | null
          updated_at?: string
        }
      }
      price_histories: {
        Row: {
          id: string
          inventory_id: string
          old_price: number
          new_price: number
          price_diff: number | null
          price_diff_pct: number | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          inventory_id: string
          old_price: number
          new_price: number
          price_diff?: number | null
          price_diff_pct?: number | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string
          old_price?: number
          new_price?: number
          price_diff?: number | null
          price_diff_pct?: number | null
          changed_by?: string | null
          changed_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          role: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
