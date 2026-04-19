import { Phone, Shield, Heart, Globe, MessageCircle } from 'lucide-react';
import '../styles/Footer.css';

const Footer = ({ variant = 'default' }) => {
  const year = new Date().getFullYear();

  if (variant === 'sidebar') {
    return (
      <div className="sidebar-footer-info">
        <div className="sidebar-footer-credit">
          <p>Powered by <span>SARQL</span></p>
          <p>© {year} All Rights Reserved.</p>
        </div>
        <div className="sidebar-support-box">
          <p className="support-label">Help & Support</p>
          <div className="support-grid">
            <div className="s-person">
              <span className="s-name">Mhd Ilyas:</span>
              <a href="tel:8086754094" className="s-link">8086754094</a>
            </div>
            <div className="s-person">
              <span className="s-name">Ansal:</span>
              <a href="tel:7558811574" className="s-link">7558811574</a>
            </div>
          </div>
          <div className="sidebar-website">
            <Globe size={10} />
            <a href="https://team.sarql.vercel.app" target="_blank" rel="noopener noreferrer">team.sarql.vercel.app</a>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <div className="footer-login-content">
        <div className="login-footer-divider"></div>
        <div className="footer-elegant-layout mini">
          <div className="footer-info-side" style={{ alignItems: 'center', width: '100%', textAlign: 'center' }}>
            <div className="info-top">
              <p>Powered by <span>SARQL</span></p>
            </div>
            <div className="info-copyright-mini">
              © {year} EduSarql. All Rights Reserved.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <footer className={`app-footer footer-${variant}`}>
      <div className="footer-elegant-layout">
        <div className="footer-horizontal-main">
          <div className="footer-logo-side">
            <img src="/img/logo.png" alt="Logo" />
          </div>
          <div className="footer-info-side">
            <div className="info-top">
              <p>Powered by <span>SARQL</span></p>
            </div>
            <div className="info-middle">
              <div className="help-support-row">
                <a href="https://wa.me/918086754094" target="_blank" rel="noopener noreferrer" className="wa-contact-link">
                  <MessageCircle size={14} />
                  <span>Help & Support</span>
                </a>
              </div>
            </div>
            <div className="info-bottom">
              <Globe size={12} />
              <a href="https://team.sarql.vercel.app" target="_blank" rel="noopener noreferrer">team.sarql.vercel.app</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom-copyright">
          © {year} EduSarql Institutional Portal. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
