export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  subscription_status?: string;
  sobriety_start_date?: string;
  gambling_weekly_amount?: number;
  blocking_enabled?: boolean;
  is_blocked?: boolean;
}

export interface Message {
  _id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface RecoveryStats {
  days_sober: number;
  money_saved: number;
  sobriety_start_date: string | null;
  gambling_weekly_amount: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
