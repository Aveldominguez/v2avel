export type ReviewMethod = 'data' | 'confirmed';

export interface ReviewSessionRow {
  id: string;
  started_at: string;
  started_by: string | null;
  started_by_name: string | null;
  /** Categorías incluidas. Vacío = todas. */
  category_ids: string[];
  finished_at: string | null;
  finished_by: string | null;
  finished_by_name: string | null;
}

export interface ReviewCheckRow {
  session_id: string;
  unit_id: string;
  checked_at: string;
  checked_by: string | null;
  checked_by_name: string | null;
  method: ReviewMethod;
}
