export const APP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .rt-page { min-height:100vh; background:#f8fafc; font-family:'DM Sans',sans-serif; padding:24px 16px 64px; }

  @keyframes rt-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rt-spin   { to{transform:rotate(360deg)} }

  .rt-fade  { animation: rt-fadeUp .4s ease both; }
  .rt-d1 { animation-delay:.06s }
  .rt-d2 { animation-delay:.12s }
  .rt-d3 { animation-delay:.18s }
  .rt-d4 { animation-delay:.24s }
  .rt-d5 { animation-delay:.30s }
  .rt-d6 { animation-delay:.36s }

  .rt-card {
    background: #ffffff;
    border: 1px solid #eef1f5;
    border-radius: 16px;
    transition: border-color .2s, box-shadow .2s;
  }
  .rt-card:hover { border-color: #d1d5db; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }

  .rt-card-header {
    display:flex; align-items:center; justify-content:space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;
    border-radius: 16px 16px 0 0;
  }
  .rt-card-header-left { display:flex; align-items:center; gap:12px; }
  .rt-card-icon {
    width:36px; height:36px; border-radius:10px;
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0;
  }
  .rt-card-title { font-size:14px; font-weight:700; color:#0f172a; letter-spacing:-0.2px; }
  .rt-card-body  { padding:22px; }

  .rt-label {
    display:block; font-size:12.5px; font-weight:600;
    color:#64748b; margin-bottom:7px; letter-spacing:0.2px;
    text-transform:uppercase;
  }
  .rt-required { color:#ef4444; margin-left:2px; }

  .rt-input {
    width:100%; padding:11px 14px;
    background:#ffffff;
    border:1.5px solid #e2e6ec;
    border-radius:10px;
    color:#0f172a;
    font-size:14px;
    font-family:'DM Sans',sans-serif;
    outline:none;
    transition:border-color .2s,background .2s,box-shadow .2s;
  }
  .rt-input::placeholder { color:#94a3b8; }
  .rt-input:focus {
    border-color:#6366f1;
    background:#ffffff;
    box-shadow:0 0 0 3px rgba(99,102,241,0.13);
  }

  .rt-input-icon-wrap { position:relative; }
  .rt-input-icon {
    position:absolute; left:13px; top:50%; transform:translateY(-50%);
    color:#94a3b8; display:flex; pointer-events:none;
  }
  .rt-input-icon-wrap .rt-input { padding-left:40px; }

  .rt-textarea {
    width:100%; padding:11px 14px;
    background:#ffffff;
    border:1.5px solid #e2e6ec;
    border-radius:10px;
    color:#0f172a;
    font-size:14px;
    font-family:'DM Sans',sans-serif;
    outline:none;
    resize:vertical; min-height:90px;
    transition:border-color .2s,background .2s;
  }
  .rt-textarea::placeholder { color:#94a3b8; }
  .rt-textarea:focus { border-color:#6366f1; background:#ffffff; box-shadow:0 0 0 3px rgba(99,102,241,0.13); }

  .rt-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media(max-width:580px){ .rt-grid2{ grid-template-columns:1fr; } }
  .rt-span2 { grid-column: span 2; }
  @media(max-width:580px){ .rt-span2{ grid-column:span 1; } }

  .rt-btn-primary {
    display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px 28px; border-radius:12px; border:none;
    font-family:'DM Sans',sans-serif; font-size:15px; font-weight:700;
    color:#fff; cursor:pointer;
    background:linear-gradient(135deg,#6366f1,#7c3aed);
    box-shadow:0 4px 18px rgba(99,102,241,0.35),inset 0 1px 0 rgba(255,255,255,0.1);
    transition:transform .15s,box-shadow .15s,opacity .15s;
    flex:1;
  }
  .rt-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.45); }
  .rt-btn-primary:active:not(:disabled){ transform:translateY(0); }
  .rt-btn-primary:disabled { opacity:.5; cursor:not-allowed; }

  .rt-btn-outline {
    display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px 28px; border-radius:12px;
    border:1.5px solid #6366f1;
    font-family:'DM Sans',sans-serif; font-size:15px; font-weight:700;
    color:#6366f1; cursor:pointer; background:#ffffff;
    transition:transform .15s,background .2s,box-shadow .15s;
    flex:1;
  }
  .rt-btn-outline:hover { transform:translateY(-2px); background:#f5f3ff; box-shadow:0 4px 16px rgba(99,102,241,0.15); }

  .rt-back-btn {
    width:40px; height:40px; border-radius:10px;
    border:1.5px solid #e2e6ec; background:#ffffff;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#94a3b8; flex-shrink:0;
    transition:border-color .2s,background .2s,color .2s;
  }
  .rt-back-btn:hover { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }

  .rt-section-gap { display:flex; flex-direction:column; gap:16px; }

  .rt-toggle-row {
    display:flex; align-items:center; gap:8px;
    padding:4px 10px 4px 14px;
    border-radius:20px;
    background:#f8fafc;
    border:1px solid #e2e6ec;
  }
  .rt-toggle-label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }

  .rt-actions { display:flex; gap:12px; flex-wrap:wrap; }
  @media(max-width:480px){ .rt-actions{ flex-direction:column; } }

  .rt-spin { animation:rt-spin 1s linear infinite; }

  .rt-divider { height:1px; background:linear-gradient(90deg,transparent,#e2e6ec,transparent); margin:4px 0; }

  .rt-card-flat {
    background:#ffffff; border:1px solid #eef1f5; border-radius:14px; padding:20px;
    transition:box-shadow .2s, border-color .2s;
  }
  .rt-card-flat:hover { border-color:#d1d5db; box-shadow:0 4px 16px rgba(0,0,0,0.04); }

  .rt-page-header { display:flex; align-items:center; gap:14px; margin-bottom:28px; }
  .rt-page-title { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; margin:0; }
  .rt-page-subtitle { font-size:13px; color:#64748b; margin:3px 0 0; font-family:'DM Sans',sans-serif; }
  .rt-page-inner { max-width:960px; margin:0 auto; display:flex; flex-direction:column; gap:16px; }

  .rt-btn-danger {
    display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px 28px; border-radius:12px; border:none;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700;
    color:#fff; cursor:pointer;
    background:linear-gradient(135deg,#ef4444,#dc2626);
    box-shadow:0 4px 18px rgba(239,68,68,0.35),inset 0 1px 0 rgba(255,255,255,0.1);
    transition:transform .15s,box-shadow .15s,opacity .15s;
  }
  .rt-btn-danger:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,68,68,0.45); }
  .rt-btn-danger:active { transform:translateY(0); }

  .rt-btn-icon {
    display:inline-flex; align-items:center; justify-content:center;
    width:32px; height:32px; border-radius:8px; border:none;
    background:transparent; color:#64748b; cursor:pointer;
    transition:background .15s,color .15s;
  }
  .rt-btn-icon:hover { background:#f1f5f9; color:#0f172a; }
`
