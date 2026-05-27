/**
 * Embeddable Verification Widget
 *
 * Serve a self-contained JS snippet that any third-party page can include:
 *   <script src="https://educred.in/api/widget/verify.js?v=<BUILD_HASH>"
 *           data-cert="EC-2024-XXXXXX"></script>
 *
 * The script injects a trust badge into the page that shows real-time
 * verification status pulled from the EduCred public API.
 */
import express from 'express';

const router = express.Router();

const BADGE_STYLES = `
  .educred-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;
    border-radius:9999px;font-family:system-ui,sans-serif;font-size:13px;
    font-weight:600;text-decoration:none;border:1px solid;cursor:default;}
  .educred-badge.valid{background:#f0fdf4;color:#15803d;border-color:#bbf7d0;}
  .educred-badge.invalid{background:#fff1f2;color:#be123c;border-color:#fecdd3;}
  .educred-badge.loading{background:#f8fafc;color:#64748b;border-color:#e2e8f0;}
  .educred-badge svg{width:14px;height:14px;flex-shrink:0;}
`.replace(/\s{2,}/g, ' ').trim();

// Served with long-term cache + immutable since content is versioned via query string
router.get('/verify.js', (req, res) => {
  const baseUrl = JSON.stringify(process.env.CLIENT_URL || 'https://educred.in');
  const apiBase = JSON.stringify(process.env.SERVER_URL || 'https://educred-backend.onrender.com');
  const buildHash = process.env.BUILD_HASH || process.env.npm_package_version || 'dev';

  const script = `
(function(){
  var styles="${BADGE_STYLES}";
  var styleEl=document.createElement('style');styleEl.textContent=styles;document.head.appendChild(styleEl);

  var BASE_URL=${baseUrl};
  var API_BASE=${apiBase};
  var scripts=document.querySelectorAll('script[data-cert]');
  scripts.forEach(function(s){
    var certId=s.getAttribute('data-cert');
    if(!certId)return;

    var badge=document.createElement('a');
    badge.href=BASE_URL+"/verify?id="+encodeURIComponent(certId);
    badge.target="_blank";badge.rel="noopener noreferrer";
    badge.className="educred-badge loading";
    badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Verifying…';
    s.parentNode.insertBefore(badge,s.nextSibling);

    fetch(API_BASE+"/api/certificates/verify/id",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({certificateId:certId})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.valid){
        badge.className="educred-badge valid";
        badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>EduCred Verified';
      } else {
        badge.className="educred-badge invalid";
        badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Not Verified';
      }
    })
    .catch(function(){
      badge.className="educred-badge invalid";
      badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Verification Unavailable';
    });
  });
})();
`.trim();

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.setHeader('X-EduCred-Widget-Version', buildHash);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(script);
});

export default router;
