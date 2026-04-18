import { Phone, Shield, Heart, Globe } from 'lucide-react';
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
        <div className="footer-support-minimal">
          <p className="powered-text-mini">Powered by <span>SARQL</span></p>
          <div className="support-link-item">
            <Globe size={12} />
            <a href="https://team.sarql.vercel.app" target="_blank" rel="noopener noreferrer">team.sarql.vercel.app</a>
          </div>
          <p className="copy-text-mini">© {year} EduSarql. All Rights Reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <footer className={`app-footer footer-${variant}`}>
      <div className="footer-container">
        <div className="footer-left">
          <p className="powered-text">Powered by <span>SARQL</span></p>
          <p className="copy-text">© {year} EduSarql. All Rights Reserved.</p>
        </div>
        
        <div className="footer-right">
          <div className="support-card">
            <div className="support-details">
              <span className="support-title">Help & Support</span>
              <div className="person-grid">
                <div className="support-person">
                  <span className="person-name">Mhd Ilyas:</span>
                  <a href="tel:8086754094" className="person-phone">8086754094</a>
                </div>
                <div className="support-person">
                  <span className="person-name">Ansal:</span>
                  <a href="tel:7558811574" className="person-phone">7558811574</a>
                </div>
              </div>
              <div className="footer-website">
                <Globe size={12} />
                <a href="https://team.sarql.vercel.app" target="_blank" rel="noopener noreferrer">team.sarql.vercel.app</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
