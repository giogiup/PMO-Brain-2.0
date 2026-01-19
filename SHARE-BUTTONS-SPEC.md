# SHARE BUTTONS SPECIFICATION

## BUTTONS

1. LinkedIn
2. Twitter/X
3. Email
4. Copy Link
5. WhatsApp

---

## LINKEDIN

**URL:**
```
https://www.linkedin.com/sharing/share-offsite/?url={encoded_url}
```

**Code:**
```javascript
function shareToLinkedIn(card) {
  const shareUrl = buildShareUrl(card.article_url, card.id, 'linkedin');
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  window.open(linkedInUrl, 'LinkedIn', 'width=600,height=600');
  trackShare('linkedin', card.id);
}
```

---

## TWITTER/X

**URL:**
```
https://twitter.com/intent/tweet?text={text}&url={url}&hashtags={hashtags}
```

**Code:**
```javascript
function shareToTwitter(card) {
  const maxTitleLength = 200;
  const title = card.title.length > maxTitleLength 
    ? card.title.substring(0, maxTitleLength) + '...' 
    : card.title;
  
  const shareUrl = buildShareUrl(card.article_url, card.id, 'twitter');
  const text = `${title} via @SmartPMO_AI`;
  const hashtags = 'PMO,AI,ProjectManagement';
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=${hashtags}`;
  
  window.open(twitterUrl, 'Twitter', 'width=600,height=600');
  trackShare('twitter', card.id);
}
```

---

## EMAIL

**mailto approach:**

```javascript
function shareViaEmail(card) {
  const subject = `PMO/AI Article: ${card.title}`;
  const shareUrl = buildShareUrl(card.article_url, card.id, 'email');
  
  const body = `I found this article on SmartPMO.ai:

${card.title}

${card.ai_description || card.summary || ''}

Read more: ${shareUrl}

--
Discovered via SmartPMO.ai - AI-powered content discovery for PMO professionals
https://smartpmo.ai`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
  trackShare('email', card.id);
}
```

---

## COPY LINK

```javascript
async function copyLink(card, event) {
  const shareUrl = buildShareUrl(card.article_url, card.id, 'copylink');
  
  try {
    await navigator.clipboard.writeText(shareUrl);
    
    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg class="icon-check" width="16" height="16"><path d="M5 12l-3-3 1-1 2 2 5-5 1 1z" fill="currentColor"/></svg> Copied!';
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('success');
    }, 2000);
    
    trackShare('copylink', card.id);
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Link copied!');
    trackShare('copylink', card.id);
  }
}
```

---

## WHATSAPP

```javascript
function shareToWhatsApp(card) {
  const shareUrl = buildShareUrl(card.article_url, card.id, 'whatsapp');
  const text = `${card.title}

${card.ai_description || card.summary || ''}

Read more: ${shareUrl}

via SmartPMO.ai`;
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const whatsappUrl = isMobile
    ? `whatsapp://send?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  
  window.open(whatsappUrl, '_blank');
  trackShare('whatsapp', card.id);
}
```

---

## SHARED UTILITIES

```javascript
function buildShareUrl(baseUrl, cardId, platform) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'smartpmo');
  url.searchParams.set('utm_medium', platform);
  url.searchParams.set('utm_campaign', 'share');
  url.searchParams.set('utm_content', cardId);
  return url.toString();
}

function trackShare(platform, cardId) {
  if (window.gtag) {
    gtag('event', 'share', {
      'event_category': 'engagement',
      'event_label': platform,
      'value': cardId
    });
  }
  
  fetch('/api/track-share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_id: cardId,
      platform: platform,
      timestamp: new Date().toISOString()
    })
  }).catch(console.error);
}
```

---

## HTML - CARD TEMPLATE

Add to both "Latest Intelligence" and "Strategic Insights" card templates:

```html
<div class="card-share-buttons">
  <button onclick="shareToLinkedIn(card)" class="share-btn" title="Share on LinkedIn">
    <svg class="icon-linkedin" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  </button>
  
  <button onclick="shareToTwitter(card)" class="share-btn" title="Share on X">
    <svg class="icon-twitter" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </button>
  
  <button onclick="shareViaEmail(card)" class="share-btn" title="Share via Email">
    <svg class="icon-email" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  </button>
  
  <button onclick="copyLink(card, event)" class="share-btn" title="Copy Link">
    <svg class="icon-link" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  </button>
  
  <button onclick="shareToWhatsApp(card)" class="share-btn" title="Share on WhatsApp">
    <svg class="icon-whatsapp" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  </button>
</div>
```

**Card data structure (both types):**
```javascript
// Latest Intelligence cards
const card = {
  id: row.id,
  title: row.title,
  article_url: row.article_url,
  ai_description: row.ai_description,
  // ... other fields
};

// Strategic Insights cards
const card = {
  id: row.id,
  title: row.title,
  article_url: row.article_url,
  summary: row.summary,
  // ... other fields
};
```

---

## CSS

```css
.card-share-buttons {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
  background: #fafafa;
}

.share-btn {
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  min-width: 40px;
}

.share-btn:hover {
  background: #f0f0f0;
  border-color: #999;
  transform: translateY(-1px);
}

.share-btn:active {
  transform: translateY(0);
}

.share-btn.success {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.icon-linkedin { color: #0A66C2; }
.icon-twitter { color: #000; }
.icon-email { color: #666; }
.icon-link { color: #666; }
.icon-whatsapp { color: #25D366; }
.icon-check { color: white; }

@media (max-width: 768px) {
  .card-share-buttons {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .share-btn {
    flex: 1 1 calc(33.333% - 4px);
    min-width: auto;
  }
}
```

---

## DATABASE

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS share_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  share_type TEXT NOT NULL,
  shared_at DATETIME NOT NULL,
  FOREIGN KEY (card_id) REFERENCES daily_insights(id)
);

CREATE INDEX idx_share_tracking_card ON share_tracking(card_id);
CREATE INDEX idx_share_tracking_date ON share_tracking(shared_at);
CREATE INDEX idx_share_tracking_type ON share_tracking(share_type);
```

**Backend endpoint:**
```javascript
// server.js or api.js
app.post('/api/track-share', async (req, res) => {
  const { card_id, platform, timestamp } = req.body;
  
  try {
    await db.run(
      'INSERT INTO share_tracking (card_id, share_type, shared_at) VALUES (?, ?, ?)',
      [card_id, platform, timestamp]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Share tracking error:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});
```

---

## ANALYTICS QUERIES

**Most shared articles:**
```sql
SELECT 
  di.title,
  di.article_url,
  COUNT(*) as total_shares,
  SUM(CASE WHEN st.share_type = 'linkedin' THEN 1 ELSE 0 END) as linkedin,
  SUM(CASE WHEN st.share_type = 'twitter' THEN 1 ELSE 0 END) as twitter,
  SUM(CASE WHEN st.share_type = 'email' THEN 1 ELSE 0 END) as email,
  SUM(CASE WHEN st.share_type = 'copylink' THEN 1 ELSE 0 END) as copylink,
  SUM(CASE WHEN st.share_type = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp
FROM share_tracking st
JOIN daily_insights di ON st.card_id = di.id
WHERE st.shared_at >= DATE('now', '-30 days')
GROUP BY di.id
ORDER BY total_shares DESC
LIMIT 20;
```

**Share activity by platform:**
```sql
SELECT 
  share_type,
  COUNT(*) as shares,
  DATE(shared_at) as date
FROM share_tracking
WHERE shared_at >= DATE('now', '-7 days')
GROUP BY share_type, DATE(shared_at)
ORDER BY date DESC, shares DESC;
```

---

## FILES TO MODIFY

1. **index.html** - Add share button HTML to card templates (both sections)
2. **styles.css** - Add share button styles
3. **main.js** - Add all share functions and utilities
4. **server.js** - Add `/api/track-share` endpoint
5. **pmo_insights.db** - Run SQL schema

---

## IMPLEMENTATION TASKS

1. Add share button HTML to both card types
2. Add share functions to main.js
3. Add CSS styling
4. Create share_tracking table
5. Add tracking endpoint
6. Test on both Latest Intelligence and Strategic Insights cards
7. Verify UTM parameters in shared URLs
8. Test mobile responsiveness
9. Test all platforms (LinkedIn, Twitter, Email, Copy, WhatsApp)

