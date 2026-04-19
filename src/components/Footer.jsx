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
      <div className="footer-exact-container">
        <div className="footer-branding-exact">
          <p className="powered-exact">Powered by <span className="sarql-brand-exact">SARQL</span></p>
          <p className="copyright-exact">© {year} EduSarql Institutional Portal. All Rights Reserved.</p>
        </div>
        
        <div className="footer-contact-exact">
          <div className="contact-col-exact">
            <span className="contact-name-exact">Mhd Ilyas</span>
            <a href="tel:8086754094" className="contact-phone-exact">8086754094</a>
          </div>
          <div className="contact-divider-exact">|</div>
          <div className="contact-col-exact">
            <span className="contact-name-exact">Ansal</span>
            <a href="tel:7558811574" className="contact-phone-exact">7558811574</a>
          </div>
        </div>

        <div className="footer-link-box-exact">
          <Globe size={11} className="globe-icon-exact" />
          <a href="https://team.sarql.vercel.app" target="_blank" rel="noopener noreferrer">team.sarql.vercel.app</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
