export type Booking = {
  id: string; status: string; total_price: number; start_time: string; end_time: string;
  courts?: { name: string; type: string };
  checked_in?: boolean;
};

export type FoodOrder = {
  id: string; status: string; total_price: number; delivery_type: string; created_at: string;
  items: { name: string; qty: number; price: number }[];
};

export type ShopOrder = {
  id: string; status: string; total_price: number; type: string; quantity: number; created_at: string;
  products?: { name: string };
};

export type CoachingSession = {
  id: string; status: string; price: number; session_time: string;
  coaches?: { name: string };
};

export type Court = { id: string; name: string; type: string; is_available: boolean; };

export type TournamentMatch = {
  id: string; tournament_id: string; format: string; round: number; match_number: number;
  bracket: string; player1_name: string | null; player2_name: string | null;
  player1_score: number; player2_score: number; winner_id: string | null; status: string;
};

export type Tournament = { id: string; name: string; format: string; status: string; date: string; };

export type Notif = {
  id: string; type: 'booking' | 'food' | 'shop' | 'coaching' | 'tournament';
  title: string; body: string; time: Date; read: boolean;
};

export const SHARED_STYLES = `
  .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:18px;animation:fadeUp .4s ease both;}
  .stat-label{font-size:11px;font-family:'Barlow',sans-serif;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;}
  .stat-val{font-size:28px;font-weight:800;line-height:1;}
  .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:20px;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:11px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
  .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl tr:hover td{background:var(--bg-hover);}
  .tbl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
  .badge-confirmed,.badge-completed,.badge-delivered{background:var(--success-bg);color:var(--success-text);}
  .badge-pending{background:var(--warning-bg);color:var(--warning-text);}
  .badge-cancelled{background:var(--error-bg);color:var(--error-text);}
  .badge-preparing,.badge-ready{background:rgba(56,138,221,.15);color:#85B7EB;}
  .badge-checked-in{background:var(--accent-bg);color:var(--accent-light);}
  .badge-ongoing{background:var(--accent-bg);color:var(--accent-light);}
  .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
  .btn:hover{border-color:var(--accent);color:var(--accent);}
  .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
  .btn.primary:hover{background:var(--accent-hover);}
  .btn.success{background:var(--success-bg);color:var(--success-text);border-color:var(--success-border);}
  .toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;border:none;flex-shrink:0;}
  .toggle.on{background:var(--accent);}
  .toggle.off{background:var(--border-hover);}
  .toggle-dot{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
  .toggle.on .toggle-dot{left:18px;}
  .toggle.off .toggle-dot{left:2px;}
  .section-title{font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;margin-bottom:16px;}
  .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
  .actions{display:flex;gap:6px;flex-wrap:wrap;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
`;