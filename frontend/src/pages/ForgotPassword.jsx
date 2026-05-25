import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reset-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; background: #f8fafc; color: #0f172a; padding: 24px;
        }
        .reset-card {
          width: 100%; max-width: 440px; background: #fff; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 40px 36px; text-align: center;
        }
        .reset-card h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .reset-card p.sub { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.5; }
        .icon-circle {
          width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px;
          background: #fef2f2; display: flex; align-items: center; justify-content: center;
        }
        .info-box {
          padding: 16px 18px; background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 12px; font-size: 14px; color: #92400e; line-height: 1.6; margin-bottom: 24px; text-align: left;
        }
        .info-box strong { color: #78350f; }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
          color: #6366f1; text-decoration: none; transition: color 0.15s;
        }
        .back-link:hover { color: #4f46e5; }
      `}</style>
      <div className="reset-root">
        <div className="reset-card">
          <div className="icon-circle">
            <ShieldAlert size={28} color="#dc2626" />
          </div>
          <h1>Forgot your password?</h1>
          <p className="sub">Please contact your admin to reset your password.</p>

          <div className="info-box">
            <strong>How to get a new password:</strong>
            <br />Reach out to your administrator and they will set a new password for your account.
          </div>

          <Link to="/login" className="back-link">
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </div>
    </>
  )
}
