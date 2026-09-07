export type ActiveModule = 'inicio' | 'vista' | 'estadisticas' | 'ajustes' | 'admin';

export type WalletType = 'digital' | 'cash' | 'savings';
export type FundType = 'physical' | 'digital';

export type CategoryType = 'expense' | 'income';

export type MovementType = 'income' | 'expense' | 'savings_deposit' | 'savings_withdrawal' | 'pending_expense';

export interface WalletCard {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  color_gradient: string;
  card_number_suffix?: string;
  initial_balance: number;
  balance?: number; // Calculated dynamically
  created_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon_name: string;
  color: string;
  is_system?: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id?: string;
  category_name?: string;
  type: MovementType;
  amount: number;
  concept: string;
  counterparty_concept?: string;
  notes?: string;
  date: string;
  scheduled_datetime?: string;
  fund_type?: FundType;
  status?: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role?: UserRole;
  is_admin?: boolean;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone_number?: string;
  age?: number;
  country?: string;
  city?: string;
  occupation?: string;
  avatar_url?: string;
  currency?: string;
  theme_preference?: 'light' | 'dark';
  created_at?: string;
}

export interface PeriodSummary {
  income: number;
  expenses: number;
  net: number;
}

export interface GlobalFinanceSummary {
  totalNetWorth: number;
  totalFreeSpending: number;
  totalSavings: number;
  daily: PeriodSummary;
  monthly: PeriodSummary;
  yearly: PeriodSummary;
}
