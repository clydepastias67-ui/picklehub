export type Booking = {
  id: string; court_id: string; start_time: string; end_time: string;
  total_price: number; status: string; courts?: { name: string; type: string };
};

export type CoachingSession = {
  id: string; session_time: string; price: number; status: string;
  coaches?: { name: string; skill_level: string };
};

export type Tournament = {
  id: string; tournament_id: string;
  tournaments?: { name: string; date: string; status: string; format: string };
};

export type TournamentMatch = {
  id: string; tournament_id: string; round: number; match_number: number;
  bracket: string; player1_name: string | null; player2_name: string | null;
  player1_score: number; player2_score: number; winner_id: string | null; status: string;
};

export type User = { id: string; email?: string; full_name?: string; };

export const SHARED_STYLES = `
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}

  .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;animation:fadeUp .5s ease both;transition:border-color .2s;}
  .stat-card:hover{border-color:var(--border-hover);}

  .booking-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);animation:fadeIn .4s ease both;gap:8px;flex-wrap:wrap;}
  .booking-row:last-child{border-bottom:none;}

  .status-badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
  .status-confirmed{background:var(--success-bg);color:var(--success-text);}
  .status-pending{background:var(--warning-bg);color:var(--warning-text);}
  .status-cancelled{background:var(--error-bg);color:var(--error-text);}
  .status-ongoing{background:var(--accent-bg);color:var(--accent-light);}
  .status-completed{background:var(--bg-hover);color:var(--text-muted);}
  .status-open{background:var(--success-bg);color:var(--success-text);}

  .section-title{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;margin-bottom:16px;}
  .section-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;animation:fadeUp .5s ease both;width:100%;min-width:0;overflow:hidden;}

  .view-all-btn{background:var(--accent);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
  .view-all-btn:hover{background:var(--accent-hover);}

  .add-btn{background:var(--accent);color:#fff;padding:8px 16px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:background .2s;display:inline-block;}
  .add-btn:hover{background:var(--accent-hover);}

  .empty-state{text-align:center;padding:40px 20px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
  .empty-state a{color:var(--accent);text-decoration:none;font-weight:500;}

  .quick-link{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px 16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;text-decoration:none;color:var(--text-primary);transition:all .2s;cursor:pointer;}
  .quick-link:hover{border-color:var(--accent);transform:translateY(-3px);}
  .quick-link-icon{width:40px;height:40px;background:var(--accent-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;}
  .quick-link-label{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;text-align:center;}
`;

export const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
export const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });