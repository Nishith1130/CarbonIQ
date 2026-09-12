export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id?: string;
  org_id?: string;
  email?: string;
  org_name?: string;
  sector_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  org_name: string;
  sector_id: string;
  turnover_inr?: number;
  export_markets?: string[];
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  sector_id: string;
  turnover_inr?: number;
  export_markets?: string[];
  created_at?: string;
}

export interface Sector {
  id?: string;
  sector_id: string;
  name?: string;
  display_name?: string;
  description: string;
  typical_scale?: string;
  process_count?: number;
}

export interface UnitProcess {
  id: string;
  name: string;
  energy_type?: string;
  typical_electric_share_pct?: number;
  typical_thermal_share_pct?: number;
}

export interface ExpectedActivity {
  activity_type: string;
  display_name: string;
  unit: string;
  suggested_unit_process?: string | null;
}

export interface SectorSchemaResponse {
  sector_id: string;
  sector_name?: string;
  display_name?: string;
  unit_processes?: UnitProcess[];
  activities_expected: ExpectedActivity[];
}

export interface ActivityInput {
  activity_type: string;
  quantity: number;
  unit: string;
  unit_process?: string | null;
  month?: number | null;
}

export interface CreateRunRequest {
  org_id?: string | null;
  sector_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  region?: string | null;
  activities: ActivityInput[];
}

export interface Totals {
  scope1: number;
  scope2: number;
  scope3_partial: number;
  total: number;
}

export interface Hotspot {
  id?: string;
  rank: number;
  unit_process: string;
  unit_process_name?: string;
  tCO2e: number;
  share_pct: number;
  scope1?: number;
  scope2?: number;
  scope3_partial?: number;
  is_estimated?: boolean;
  data_source?: string;
}

export interface ProcessBaseline {
  unit_process: string;
  unit_process_name?: string;
  scope1?: number;
  scope2?: number;
  scope3_partial?: number;
  tCO2e: number;
  share_pct?: number;
}

export interface RunResponse {
  id: string;
  org_id: string;
  sector_id: string;
  period_start?: string;
  period_end?: string;
  ef_version?: string;
  totals: Totals;
  hotspots: Hotspot[];
  baseline_by_process?: ProcessBaseline[];
  line_items_count?: number;
  created_at?: string;
}

export interface MACCItem {
  id?: string;
  recommendation_id?: string;
  intervention_id: string;
  intervention_name: string;
  unit_process_id?: string | null;
  cost_capex_inr: number;
  annual_saving_inr: number;
  tco2e_reduced_annual: number;
  cost_per_tco2e: number;
  payback_years: number;
  circular_type?: string | null;
  source_citation: string;
  rationale: string;
  // Optional aliases for compatibility
  title?: string;
  description?: string;
  capex?: number;
  annual_opex_savings?: number;
  annual_tco2e_savings?: number;
  marginal_abatement_cost?: number;
  roi_pct?: number;
  implementation_time_months?: number;
  difficulty_score?: number;
  category?: string;
}

export interface MACCResponse {
  run_id: string;
  total_interventions?: number;
  items: MACCItem[];
  macc_curve?: MACCItem[];
}

export interface ReportResponse {
  id: string;
  run_id: string;
  template_type: string;
  download_url: string;
  file_size_bytes: number;
  generated_at: string;
  summary?: string;
}
