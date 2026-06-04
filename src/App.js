import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// SUPABASE CONFIG
// החלף את הערכים האלה בערכים מה-Supabase Dashboard שלך
// Settings → API → Project URL + anon key
// ═══════════════════════════════════════════════════════
const SUPABASE_URL = "https://evqqxpaagsaizjrbbikn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cXF4cGFhZ3NhaXpqcmJiaWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njg3MzAsImV4cCI6MjA5NjE0NDczMH0.18AApIN7gTePCIjbRzO1TjUWLz7OlQxckqn7RoxZ2xs";

const RESTAURANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ─── Supabase client (no npm needed, raw fetch) ───────
const sb = {
  headers: {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },

  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...this.headers, Authorization: `Bearer ${token}` },
    });
  },

  async getProfile(userId, token) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      { headers: { ...this.headers, Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    return data[0];
  },

  async query(table, params = {}, token) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${qs}&order=created_at.desc`,
      { headers: { ...this.headers, Authorization: `Bearer ${token}` } }
    );
    return r.json();
  },

  async insert(table, body, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    return r.json();
  },

  async update(table, id, body, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    return r.json();
  },
};

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const ROLE_LABELS = {
  manager: "מנהל מסעדה",
  maitre_d: 'אחמ"ש',
  kitchen_manager: "מנהל מטבח",
  kitchen_staff: "עובד מטבח",
};

const CATEGORIES  = ["המבורגרים", "ראשונות", "סלטים", "קינוחים", "שתייה", "אחר"];
const CLOSE_R     = ["חומר גלם חסר", "תקלה", "חוסר כוח אדם", "אחר"];
const RETURN_R    = ["עשוי מדי","לא עשוי מספיק","קר","טעות בהזמנה","חסר רכיב","טעם לא תקין","תלונת לקוח","אחר"];
const COLORS      = ["#f5a623","#4fc3f7","#ef5350","#66bb6a","#ce93d8","#80cbc4","#ffcc02","#f48fb1","#a5d6a7","#90caf9"];
const TODAY       = () => new Date().toLocaleDateString("he-IL");
const NOW_TIME    = () => new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Heebo',sans-serif;direction:rtl;background:#0f1117;color:#e8eaf0;min-height:100vh}
:root{
  --bg:#0f1117;--surf:#161b27;--card:#1e2535;--hover:#252d42;
  --accent:#f5a623;--acc-dim:rgba(245,166,35,.15);--acc2:#4fc3f7;
  --danger:#ef5350;--danger-d:rgba(239,83,80,.15);
  --success:#66bb6a;--suc-d:rgba(102,187,106,.12);
  --warn:#ffa726;--warn-d:rgba(255,167,38,.12);
  --tp:#e8eaf0;--ts:#8892a4;--tm:#4a5568;
  --br:rgba(255,255,255,.07);--brs:rgba(255,255,255,.13);
  --r:10px;--rl:14px
}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:var(--brs);border-radius:2px}

.app{display:flex;flex-direction:column;min-height:100vh}

/* Topbar */
.topbar{
  background:var(--surf);border-bottom:1px solid var(--br);
  padding:0 24px;display:flex;align-items:center;justify-content:space-between;
  height:58px;position:sticky;top:0;z-index:50
}
.logo{font-size:18px;font-weight:800;color:var(--tp)}
.logo span{color:var(--accent)}
.nav-tabs{display:flex;gap:2px;overflow-x:auto}
.nav-tab{
  padding:18px 16px;cursor:pointer;font-size:14px;font-weight:500;
  color:var(--ts);border-bottom:2px solid transparent;white-space:nowrap;
  display:flex;align-items:center;gap:6px;transition:color .2s
}
.nav-tab:hover{color:var(--tp)}
.nav-tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}
.user-chip{
  display:flex;align-items:center;gap:8px;padding:6px 12px;
  background:var(--card);border-radius:20px;border:1px solid var(--br)
}
.avatar{
  width:30px;height:30px;border-radius:50%;
  background:var(--acc-dim);border:1px solid var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:var(--accent);flex-shrink:0
}

/* Page */
.page{padding:24px;max-width:1080px;margin:0 auto;width:100%}
.page-title{font-size:22px;font-weight:800;color:var(--tp)}
.page-sub{font-size:13px;color:var(--ts);margin-top:3px}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:10px}

/* Grids */
.g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px}

/* Cards */
.card{background:var(--card);border:1px solid var(--br);border-radius:var(--rl);padding:18px;margin-bottom:16px}
.card-title{font-size:15px;font-weight:700;color:var(--tp);margin-bottom:14px}

/* Metric card */
.mcard{background:var(--card);border:1px solid var(--br);border-radius:var(--rl);padding:18px;position:relative;overflow:hidden}
.mcard::before{content:'';position:absolute;top:0;right:0;width:3px;height:100%}
.mcard.danger::before{background:var(--danger)}
.mcard.warn::before{background:var(--warn)}
.mcard.info::before{background:var(--acc2)}
.mcard.success::before{background:var(--success)}
.mlabel{font-size:11px;color:var(--ts);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.mval{font-size:30px;font-weight:800;color:var(--tp);line-height:1}
.msub{font-size:12px;color:var(--tm);margin-top:5px}
.micon{position:absolute;bottom:12px;left:12px;font-size:30px;opacity:.12}

/* Alert */
.alert{background:rgba(239,83,80,.1);border:1px solid rgba(239,83,80,.3);border-radius:var(--r);padding:12px 16px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start}
.alert.warn{background:rgba(255,167,38,.1);border-color:rgba(255,167,38,.3)}
.alert-title{font-size:13px;color:var(--tp);font-weight:600}
.alert-sub{font-size:12px;color:var(--ts);margin-top:2px}

/* Badges */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge-danger{background:var(--danger-d);color:var(--danger);border:1px solid rgba(239,83,80,.3)}
.badge-warn{background:var(--warn-d);color:var(--warn);border:1px solid rgba(255,167,38,.3)}
.badge-success{background:var(--suc-d);color:var(--success);border:1px solid rgba(102,187,106,.3)}
.badge-info{background:rgba(79,195,247,.12);color:var(--acc2);border:1px solid rgba(79,195,247,.3)}
.badge-neu{background:rgba(255,255,255,.06);color:var(--ts);border:1px solid var(--brs)}
.nav-badge{background:var(--danger);color:white;font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px}

/* Buttons */
.btn{padding:9px 18px;border-radius:var(--r);border:none;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;font-weight:600;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--accent);color:#1a1000}
.btn-primary:hover:not(:disabled){background:#e89a1a;transform:translateY(-1px)}
.btn-danger{background:var(--danger-d);color:var(--danger);border:1px solid var(--danger)}
.btn-danger:hover:not(:disabled){background:var(--danger);color:white}
.btn-success{background:var(--suc-d);color:var(--success);border:1px solid var(--success)}
.btn-success:hover:not(:disabled){background:var(--success);color:white}
.btn-ghost{background:transparent;color:var(--ts);border:1px solid var(--brs)}
.btn-ghost:hover:not(:disabled){background:var(--hover);color:var(--tp)}
.btn-warn{background:var(--warn-d);color:var(--warn);border:1px solid var(--warn)}
.btn-warn:hover:not(:disabled){background:var(--warn);color:#1a1000}
.btn-sm{padding:5px 12px;font-size:12px}

/* Form */
.fg{margin-bottom:14px}
.fl{font-size:13px;color:var(--ts);font-weight:500;margin-bottom:5px;display:block}
.fi,.fs,.fta{width:100%;background:var(--card);border:1px solid var(--brs);border-radius:var(--r);padding:9px 13px;color:var(--tp);font-family:'Heebo',sans-serif;font-size:14px;direction:rtl;outline:none;transition:border-color .2s}
.fi:focus,.fs:focus,.fta:focus{border-color:var(--accent)}
.fta{resize:vertical;min-height:75px}
.err{color:var(--danger);font-size:13px;margin-bottom:10px}

/* Dish item */
.dish-item{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surf);border:1px solid var(--br);border-radius:var(--r);margin-bottom:8px;transition:border-color .2s}
.dish-item:hover{border-color:var(--brs)}
.dish-item.closed{border-right:3px solid var(--danger)}
.dish-item.open{border-right:3px solid var(--success)}
.dish-name{font-size:14px;font-weight:600;color:var(--tp)}
.dish-meta{font-size:12px;color:var(--tm);margin-top:3px}

/* Bar chart */
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.bar-label{font-size:13px;color:var(--ts);min-width:120px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:7px;background:var(--hover);border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
.bar-count{font-size:13px;font-weight:600;color:var(--tp);min-width:24px;text-align:center}

/* Table */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:right;padding:9px 12px;font-size:11px;font-weight:600;color:var(--tm);border-bottom:1px solid var(--br);text-transform:uppercase;letter-spacing:.5px}
td{padding:11px 12px;border-bottom:1px solid var(--br);color:var(--ts)}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--hover)}

/* Tabs */
.tabs{display:flex;gap:3px;background:var(--surf);padding:4px;border-radius:var(--r);margin-bottom:16px;border:1px solid var(--br)}
.tab{flex:1;text-align:center;padding:8px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;color:var(--ts);transition:all .2s}
.tab.active{background:var(--card);color:var(--tp)}

/* Task */
.task-item{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--surf);border:1px solid var(--br);border-radius:var(--r);margin-bottom:7px;cursor:pointer;transition:all .2s}
.task-item:hover{border-color:var(--brs)}
.task-item.done{opacity:.5}
.task-cb{width:20px;height:20px;border-radius:6px;border:2px solid var(--brs);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:700;transition:all .2s}
.task-item.done .task-cb{background:var(--success);border-color:var(--success);color:white}
.task-text{flex:1;font-size:14px;color:var(--ts)}
.task-item.done .task-text{text-decoration:line-through}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--surf);border:1px solid var(--brs);border-radius:var(--rl);padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
.modal-title{font-size:17px;font-weight:700;margin-bottom:18px;color:var(--tp)}

/* Login */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(circle at 20% 80%,rgba(245,166,35,.06) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(79,195,247,.06) 0%,transparent 50%)}
.login-card{background:var(--surf);border:1px solid var(--br);border-radius:18px;padding:38px;width:380px;max-width:95vw}

/* Spinner */
.spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.2);border-top-color:white;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* Loading state */
.loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:var(--ts);font-size:15px}

/* Progress bar */
.prog-track{background:var(--hover);height:10px;border-radius:5px;overflow:hidden;margin-bottom:6px}
.prog-fill{height:100%;border-radius:5px;transition:width .4s}

/* Empty state */
.empty{text-align:center;padding:32px 20px;color:var(--tm);font-size:14px}
.empty-icon{font-size:36px;margin-bottom:8px}

/* Grid 2-col helper */
.g2-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:500px){.g2-cols{grid-template-columns:1fr}}

@media(max-width:768px){
  .topbar{padding:0 14px}
  .page{padding:14px}
  .nav-tab span.label{display:none}
}
`;

// ═══════════════════════════════════════════════════════
// AUTH CONTEXT helpers
// ═══════════════════════════════════════════════════════
function useAuth() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ros_session") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!session);

  useEffect(() => {
    if (session?.access_token && !profile) {
      sb.getProfile(session.user.id, session.access_token)
        .then(p => { setProfile(p); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [session]);

  const signIn = async (email, password) => {
    const data = await sb.signIn(email, password);
    if (data.error || !data.user) throw new Error(data.error?.message || "אימייל או סיסמה שגויים");
    localStorage.setItem("ros_session", JSON.stringify(data));
    setSession(data);
    const p = await sb.getProfile(data.user.id, data.access_token);
    setProfile(p);
    return p;
  };

  const signOut = async () => {
    if (session?.access_token) await sb.signOut(session.access_token);
    localStorage.removeItem("ros_session");
    setSession(null);
    setProfile(null);
  };

  return { session, profile, loading, signIn, signOut };
}

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("avner@restaurantos.co.il");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async () => {
    if (!email || !pass) { setErr("מלא אימייל וסיסמה"); return; }
    setLoading(true); setErr("");
    try { await onLogin(email, pass); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, background: "var(--acc-dim)", border: "1px solid var(--accent)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 26 }}>🍽️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--tp)" }}>Restaurant<span style={{ color: "var(--accent)" }}>OS</span></div>
          <div style={{ fontSize: 13, color: "var(--ts)", marginTop: 4 }}>מערכת ניהול מסעדה</div>
        </div>

        <div className="fg">
          <label className="fl">אימייל</label>
          <input className="fi" type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} placeholder="your@email.com" />
        </div>
        <div className="fg">
          <label className="fl">סיסמה</label>
          <input className="fi" type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "11px 0" }} onClick={handle} disabled={loading}>
          {loading ? <span className="spin" /> : "כניסה למערכת"}
        </button>

        <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--card)", borderRadius: "var(--r)", border: "1px solid var(--br)" }}>
          <div style={{ fontSize: 12, color: "var(--ts)", fontWeight: 600, marginBottom: 6 }}>🔑 פרטי גישה לדוגמה</div>
          <div style={{ fontSize: 12, color: "var(--tm)" }}>אימייל: avner@restaurantos.co.il</div>
          <div style={{ fontSize: 12, color: "var(--tm)" }}>סיסמה: Avner2025!</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function Dashboard({ closed, returns }) {
  const closedNow = closed.filter(d => d.status === "closed").length;
  const rToday = returns.filter(r => r.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length;

  const dishC = {}; returns.forEach(r => { dishC[r.dish_name] = (dishC[r.dish_name] || 0) + 1; });
  const top5 = Object.entries(dishC).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxD = top5[0]?.[1] || 1;

  const reaC = {}; returns.forEach(r => { reaC[r.reason] = (reaC[r.reason] || 0) + 1; });
  const topR = Object.entries(reaC).sort((a, b) => b[1] - a[1]);
  const maxR = topR[0]?.[1] || 1;

  const diotyCnt = returns.filter(r => r.dish_name === "דיוטי קומבו" && r.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">סקירה כללית · {TODAY()}</div>
      </div>

      {diotyCnt >= 3 && (
        <div className="alert">
          <div style={{ fontSize: 18 }}>⚠️</div>
          <div><div className="alert-title">דיוטי קומבו חזרה {diotyCnt} פעמים היום!</div><div className="alert-sub">נדרש טיפול מיידי</div></div>
        </div>
      )}
      {closedNow >= 2 && (
        <div className="alert warn">
          <div style={{ fontSize: 18 }}>🚫</div>
          <div><div className="alert-title">{closedNow} מנות סגורות כרגע</div><div className="alert-sub">עדכן את הצוות</div></div>
        </div>
      )}

      <div className="g4">
        {[
          { label: "מנות סגורות כרגע", val: closedNow, sub: "ממתינות לפתיחה", icon: "🚫", cls: "danger" },
          { label: "החזרות היום", val: rToday, sub: "מנות שחזרו", icon: "↩️", cls: "warn" },
          { label: "סה״כ החזרות", val: returns.length, sub: "כל הזמנים", icon: "📊", cls: "info" },
          { label: "אחוז החזרות", val: "–", sub: "מסך ההזמנות", icon: "📈", cls: "success" },
        ].map(m => (
          <div key={m.label} className={`mcard ${m.cls}`}>
            <div className="mlabel">{m.label}</div>
            <div className="mval">{m.val}</div>
            <div className="msub">{m.sub}</div>
            <div className="micon">{m.icon}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-title">Top 5 מנות שחזרו</div>
          {top5.length === 0 ? <div className="empty"><div className="empty-icon">🎉</div>אין החזרות</div>
            : top5.map(([dish, cnt], i) => (
              <div key={dish} className="bar-row">
                <div className="bar-label">{dish}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / maxD) * 100}%`, background: COLORS[i] }} /></div>
                <div className="bar-count">{cnt}</div>
              </div>
            ))}
        </div>
        <div className="card">
          <div className="card-title">סיבות החזרה</div>
          {topR.map(([r, cnt], i) => (
            <div key={r} className="bar-row">
              <div className="bar-label">{r}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / maxR) * 100}%`, background: COLORS[i % 10] }} /></div>
              <div className="bar-count">{cnt}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">מנות סגורות עכשיו</div>
        {closed.filter(d => d.status === "closed").length === 0
          ? <div className="empty"><div className="empty-icon">✅</div>כל המנות פתוחות</div>
          : closed.filter(d => d.status === "closed").map(d => (
            <div key={d.id} className="dish-item closed">
              <div>
                <div className="dish-name">{d.dish_name}</div>
                <div className="dish-meta">{d.reason} · {d.closed_at ? new Date(d.closed_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
              </div>
              <span className="badge badge-danger">סגור</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CLOSED DISHES
// ═══════════════════════════════════════════════════════
function ClosedDishes({ closed, setClosed, menuItems, session, profile }) {
  const [showF, setShowF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ dish_name: "", category: "", reason: "", notes: "" });

  const doClose = async () => {
    if (!f.dish_name || !f.category || !f.reason) return;
    setSaving(true);
    const body = {
      restaurant_id: RESTAURANT_ID,
      dish_name: f.dish_name,
      category: f.category,
      reason: f.reason,
      notes: f.notes,
      status: "closed",
      closed_by: profile.id,
      closed_at: new Date().toISOString(),
    };
    const res = await sb.insert("closed_dishes", body, session.access_token);
    if (res?.[0]) setClosed(p => [res[0], ...p]);
    setF({ dish_name: "", category: "", reason: "", notes: "" });
    setShowF(false); setSaving(false);
  };

  const reopen = async (id) => {
    const body = { status: "open", reopened_by: profile.id, reopened_at: new Date().toISOString() };
    const res = await sb.update("closed_dishes", id, body, session.access_token);
    if (res?.[0]) setClosed(p => p.map(d => d.id === id ? res[0] : d));
  };

  const active = closed.filter(d => d.status === "closed");
  const done = closed.filter(d => d.status === "open");
  const dishOptions = menuItems.length > 0 ? menuItems.map(m => m.name) : ["אסאדו בורגר","אמריקן דרים","ספייסי צ'יקן","דיוטי קומבו","קיסר סלד","ריבס","לאבה קייק"];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">סגירת מנות</div><div className="page-sub">דיווח ומעקב מנות שאינן זמינות</div></div>
        <button className="btn btn-danger" onClick={() => setShowF(true)}>+ סגור מנה</button>
      </div>

      {showF && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowF(false)}>
          <div className="modal">
            <div className="modal-title">🚫 סגירת מנה</div>
            <div className="fg"><label className="fl">שם המנה *</label>
              <select className="fs" value={f.dish_name} onChange={e => setF(p => ({ ...p, dish_name: e.target.value }))}>
                <option value="">בחר מנה...</option>
                {dishOptions.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">קטגוריה *</label>
              <select className="fs" value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                <option value="">בחר קטגוריה...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">סיבת הסגירה *</label>
              <select className="fs" value={f.reason} onChange={e => setF(p => ({ ...p, reason: e.target.value }))}>
                <option value="">בחר סיבה...</option>
                {CLOSE_R.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">הערות</label>
              <textarea className="fta" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="פרט..." />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowF(false)}>ביטול</button>
              <button className="btn btn-danger" onClick={doClose} disabled={saving || !f.dish_name || !f.category || !f.reason}>
                {saving ? <span className="spin" /> : "סגור מנה"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>מנות סגורות כרגע</div>
          <span className="badge badge-danger">{active.length}</span>
        </div>
        {active.length === 0
          ? <div className="empty"><div className="empty-icon">✅</div>אין מנות סגורות</div>
          : active.map(d => (
            <div key={d.id} className="dish-item closed">
              <div>
                <div className="dish-name">{d.dish_name}</div>
                <div className="dish-meta">{d.category} · {d.reason} · {d.closed_at ? new Date(d.closed_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                {d.notes && <div className="dish-meta" style={{ marginTop: 3 }}>📝 {d.notes}</div>}
              </div>
              <button className="btn btn-success btn-sm" onClick={() => reopen(d.id)}>החזר לתפריט</button>
            </div>
          ))}
      </div>

      {done.length > 0 && (
        <div className="card">
          <div className="card-title">חזרו לתפריט</div>
          {done.map(d => (
            <div key={d.id} className="dish-item open" style={{ opacity: 0.7 }}>
              <div>
                <div className="dish-name">{d.dish_name}</div>
                <div className="dish-meta">נסגר · {d.closed_at ? new Date(d.closed_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : ""} · נפתח · {d.reopened_at ? new Date(d.reopened_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
              </div>
              <span className="badge badge-success">פתוח</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RETURNS
// ═══════════════════════════════════════════════════════
function Returns({ returns, setReturns, menuItems, session, profile }) {
  const [showF, setShowF] = useState(false);
  const [tab, setTab] = useState("list");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ dish_name: "", table_number: "", reason: "", notes: "" });

  const submit = async () => {
    if (!f.dish_name || !f.table_number || !f.reason) return;
    setSaving(true);
    const body = {
      restaurant_id: RESTAURANT_ID,
      dish_name: f.dish_name,
      table_number: f.table_number,
      reason: f.reason,
      notes: f.notes,
      reported_by: profile.id,
    };
    const res = await sb.insert("dish_returns", body, session.access_token);
    if (res?.[0]) setReturns(p => [res[0], ...p]);
    setF({ dish_name: "", table_number: "", reason: "", notes: "" });
    setShowF(false); setSaving(false);
  };

  const dishC = {}; returns.forEach(r => { dishC[r.dish_name] = (dishC[r.dish_name] || 0) + 1; });
  const top10 = Object.entries(dishC).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxD = top10[0]?.[1] || 1;
  const reaC = {}; returns.forEach(r => { reaC[r.reason] = (reaC[r.reason] || 0) + 1; });
  const topR = Object.entries(reaC).sort((a, b) => b[1] - a[1]);
  const maxR = topR[0]?.[1] || 1;
  const alerts = top10.filter(([, c]) => c >= 3).map(([dish, count]) => ({ dish, count }));
  const dishOptions = menuItems.length > 0 ? menuItems.map(m => m.name) : ["אסאדו בורגר","אמריקן דרים","ספייסי צ'יקן","דיוטי קומבו","קיסר סלד","ריבס","לאבה קייק"];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">מנות שחזרו</div><div className="page-sub">מעקב וזיהוי בעיות חוזרות</div></div>
        <button className="btn btn-warn" onClick={() => setShowF(true)}>+ דווח החזרה</button>
      </div>

      {alerts.map(a => (
        <div key={a.dish} className="alert">
          <div style={{ fontSize: 18 }}>⚠️</div>
          <div><div className="alert-title">{a.dish} חזרה {a.count} פעמים!</div><div className="alert-sub">מנה בעייתית – נדרש בדיקה</div></div>
        </div>
      ))}

      <div className="tabs">
        {[["list", "רשימת החזרות"], ["analysis", "ניתוח נתונים"]].map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>

      {showF && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowF(false)}>
          <div className="modal">
            <div className="modal-title">↩️ דיווח החזרת מנה</div>
            <div className="fg"><label className="fl">שם המנה *</label>
              <select className="fs" value={f.dish_name} onChange={e => setF(p => ({ ...p, dish_name: e.target.value }))}>
                <option value="">בחר מנה...</option>
                {dishOptions.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="g2-cols" style={{ marginBottom: 14 }}>
              <div><label className="fl">שולחן *</label><input className="fi" type="number" placeholder="7" value={f.table_number} onChange={e => setF(p => ({ ...p, table_number: e.target.value }))} /></div>
              <div><label className="fl">מדווח</label><input className="fi" value={profile?.full_name || ""} readOnly style={{ opacity: 0.6 }} /></div>
            </div>
            <div className="fg"><label className="fl">סיבת ההחזרה *</label>
              <select className="fs" value={f.reason} onChange={e => setF(p => ({ ...p, reason: e.target.value }))}>
                <option value="">בחר סיבה...</option>
                {RETURN_R.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">הערות</label>
              <textarea className="fta" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="תאר..." />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowF(false)}>ביטול</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving || !f.dish_name || !f.table_number || !f.reason}>
                {saving ? <span className="spin" /> : "שמור דיווח"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "list" && (
        <div className="card">
          <div className="card-title">כל ההחזרות ({returns.length})</div>
          {returns.length === 0
            ? <div className="empty"><div className="empty-icon">🎉</div>אין החזרות עדיין</div>
            : <div className="tw">
              <table>
                <thead><tr>{["מנה","שולחן","סיבה","הערות","שעה"].map(t => <th key={t}>{t}</th>)}</tr></thead>
                <tbody>
                  {returns.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: "var(--tp)" }}>{r.dish_name}</td>
                      <td><span className="badge badge-neu">שולחן {r.table_number}</span></td>
                      <td><span className="badge badge-warn">{r.reason}</span></td>
                      <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes || "—"}</td>
                      <td>{r.created_at ? new Date(r.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </div>
      )}

      {tab === "analysis" && (
        <div className="g2">
          <div className="card">
            <div className="card-title">Top 10 מנות</div>
            {top10.map(([dish, cnt], i) => (
              <div key={dish} className="bar-row">
                <div className="bar-label">{dish}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / maxD) * 100}%`, background: COLORS[i % 10] }} /></div>
                <div className="bar-count">{cnt}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">סיבות החזרה</div>
            {topR.map(([r, cnt], i) => (
              <div key={r} className="bar-row">
                <div className="bar-label">{r}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / maxR) * 100}%`, background: COLORS[i % 10] }} /></div>
                <div className="bar-count">{cnt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MORNING TASKS
// ═══════════════════════════════════════════════════════
function MorningTasks({ closed, returns, tasks, setTasks, session, profile }) {
  const toggleTask = async (task) => {
    const body = task.is_done
      ? { is_done: false, done_by: null, done_at: null }
      : { is_done: true, done_by: profile.id, done_at: new Date().toISOString() };
    const res = await sb.update("morning_tasks", task.id, body, session.access_token);
    if (res?.[0]) setTasks(p => p.map(t => t.id === task.id ? res[0] : t));
    else setTasks(p => p.map(t => t.id === task.id ? { ...t, ...body } : t));
  };

  const done = tasks.filter(t => t.is_done).length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">משימות בוקר</div>
        <div className="page-sub">פתיחת יום · {TODAY()}</div>
      </div>

      <div className="g2">
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>התקדמות</div>
            <span className="badge badge-info">{done}/{tasks.length}</span>
          </div>
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--accent)" }} />
          </div>
          <div style={{ fontSize: 13, color: "var(--tm)" }}>{pct}% הושלם</div>
        </div>
        <div className="card">
          <div className="card-title">סיכום</div>
          <div style={{ display: "flex", gap: 20 }}>
            <div><div style={{ fontSize: 11, color: "var(--ts)", marginBottom: 4 }}>מנות סגורות</div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--danger)" }}>{closed.filter(d => d.status === "closed").length}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--ts)", marginBottom: 4 }}>החזרות היום</div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--warn)" }}>{returns.length}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--ts)", marginBottom: 4 }}>משימות</div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)" }}>{done}/{tasks.length}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">✅ רשימת משימות</div>
        {tasks.length === 0
          ? <div className="empty"><div className="empty-icon">☀️</div>אין משימות להיום</div>
          : tasks.map(t => (
            <div key={t.id} className={`task-item ${t.is_done ? "done" : ""}`} onClick={() => toggleTask(t)}>
              <div className="task-cb">{t.is_done ? "✓" : ""}</div>
              <div className="task-text">{t.text}</div>
              <span className={`badge ${t.task_type === "stock" ? "badge-warn" : "badge-neu"}`}>{t.task_type === "stock" ? "מלאי" : "שגרה"}</span>
            </div>
          ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// MENU MANAGEMENT
// ═══════════════════════════════════════════════════════
function MenuManager({ menuItems, setMenuItems, session, profile }) {
  const [showF, setShowF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [f, setF] = useState({ name: "", category: "" });

  const canEdit = ["manager", "kitchen_manager"].includes(profile?.role);

  const addItem = async () => {
    if (!f.name || !f.category) return;
    setSaving(true);
    const body = { restaurant_id: RESTAURANT_ID, name: f.name, category: f.category, is_active: true };
    const res = await sb.insert("menu_items", body, session.access_token);
    if (res?.[0]) setMenuItems(p => [...p, res[0]]);
    setF({ name: "", category: "" });
    setShowF(false);
    setSaving(false);
  };

  const toggleActive = async (item) => {
    const res = await sb.update("menu_items", item.id, { is_active: !item.is_active }, session.access_token);
    if (res?.[0]) setMenuItems(p => p.map(m => m.id === item.id ? res[0] : m));
  };

  const deleteItem = async (id) => {
    setDeleting(id);
    await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...sb.headers, Authorization: `Bearer ${session.access_token}` },
    });
    setMenuItems(p => p.filter(m => m.id !== id));
    setDeleting(null);
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = menuItems.filter(m => m.category === cat);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">ניהול תפריט</div>
          <div className="page-sub">הוסף, ערוך והסר מנות מהתפריט</div>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setShowF(true)}>+ הוסף מנה</button>}
      </div>

      {showF && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowF(false)}>
          <div className="modal">
            <div className="modal-title">📋 הוספת מנה חדשה</div>
            <div className="fg">
              <label className="fl">שם המנה *</label>
              <input className="fi" placeholder="למשל: טרופל בורגר" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="fl">קטגוריה *</label>
              <select className="fs" value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                <option value="">בחר קטגוריה...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowF(false)}>ביטול</button>
              <button className="btn btn-primary" onClick={addItem} disabled={saving || !f.name || !f.category}>
                {saving ? <span className="spin" /> : "הוסף מנה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {CATEGORIES.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div className="card-title" style={{ margin: 0 }}>{cat}</div>
              <span className="badge badge-neu">{items.length}</span>
            </div>
            {items.map(item => (
              <div key={item.id} className="dish-item" style={{ borderRight: `3px solid ${item.is_active ? "var(--success)" : "var(--tm)"}` }}>
                <div>
                  <div className="dish-name" style={{ opacity: item.is_active ? 1 : 0.5 }}>{item.name}</div>
                  <div className="dish-meta">{item.category}</div>
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className={`btn btn-sm ${item.is_active ? "btn-ghost" : "btn-success"}`}
                      onClick={() => toggleActive(item)}
                    >
                      {item.is_active ? "השבת" : "הפעל"}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteItem(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? <span className="spin" /> : "מחק"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {menuItems.length === 0 && (
        <div className="card">
          <div className="empty"><div className="empty-icon">📋</div>אין מנות בתפריט עדיין</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const { session, profile, loading: authLoading, signIn, signOut } = useAuth();
  const [nav, setNav] = useState("dash");
  const [closed, setClosed] = useState([]);
  const [returns, setReturns] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;
    setDataLoading(true);
    try {
      const [c, r, m, t] = await Promise.all([
        sb.query("closed_dishes", { restaurant_id: `eq.${RESTAURANT_ID}`, select: "*" }, session.access_token),
        sb.query("dish_returns",  { restaurant_id: `eq.${RESTAURANT_ID}`, select: "*" }, session.access_token),
        sb.query("menu_items",    { restaurant_id: `eq.${RESTAURANT_ID}`, select: "*" }, session.access_token),
        sb.query("morning_tasks", { restaurant_id: `eq.${RESTAURANT_ID}`, task_date: `eq.${new Date().toISOString().slice(0, 10)}`, select: "*" }, session.access_token),
      ]);
      if (Array.isArray(c)) setClosed(c);
      if (Array.isArray(r)) setReturns(r);
      if (Array.isArray(m)) setMenuItems(m);
      if (Array.isArray(t)) setTasks(t);
    } finally { setDataLoading(false); }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  if (authLoading) return (
    <>
      <style>{css}</style>
      <div className="loading-screen"><div className="spin" style={{ width: 36, height: 36, borderWidth: 3 }} /><div>טוען...</div></div>
    </>
  );

  if (!session || !profile) return (
    <>
      <style>{css}</style>
      <LoginScreen onLogin={signIn} />
    </>
  );

  const closedCount = closed.filter(d => d.status === "closed").length;
  const returnsCount = returns.length;
  const initials = profile.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?";

  const navItems = [
    { id: "dash",    label: "Dashboard",     icon: "📊" },
    { id: "closed",  label: "סגירת מנות",    icon: "🚫", badge: closedCount || null },
    { id: "returns", label: "מנות שחזרו",    icon: "↩️", badge: returnsCount || null },
    { id: "morning", label: "משימות בוקר",   icon: "☀️" },
    { id: "menu",    label: "ניהול תפריט",   icon: "📋" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div className="logo">Restaurant<span>OS</span></div>
            <div className="nav-tabs">
              {navItems.map(item => (
                <div key={item.id} className={`nav-tab ${nav === item.id ? "active" : ""}`} onClick={() => setNav(item.id)}>
                  <span>{item.icon}</span>
                  <span className="label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div style={{ fontSize: 13, color: "var(--tp)", fontWeight: 500 }}>{profile.full_name}</div>
            <span className="badge badge-info" style={{ fontSize: 11, padding: "2px 8px" }}>{ROLE_LABELS[profile.role]}</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ padding: "3px 10px" }}>יציאה</button>
          </div>
        </div>

        <div className="page">
          {nav === "dash"    && <Dashboard closed={closed} returns={returns} />}
          {nav === "closed"  && <ClosedDishes closed={closed} setClosed={setClosed} menuItems={menuItems} session={session} profile={profile} />}
          {nav === "returns" && <Returns returns={returns} setReturns={setReturns} menuItems={menuItems} session={session} profile={profile} />}
          {nav === "morning" && <MorningTasks closed={closed} returns={returns} tasks={tasks} setTasks={setTasks} session={session} profile={profile} />}
          {nav === "menu"    && <MenuManager menuItems={menuItems} setMenuItems={setMenuItems} session={session} profile={profile} />}
        </div>
      </div>
    </>
  );
}
