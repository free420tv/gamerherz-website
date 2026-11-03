import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'content/articles');
const DEST = path.join(ROOT, 'site');
const BASE = 'https://gamerherz-website.pages.dev';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeUrl = value => {
  const v = String(value ?? '').trim();
  if (v.startsWith('/media/')) return 'https://raw.githubusercontent.com/free420tv/gamerherz-website/main' + v;
  try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
};
function parse(markdown) {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  const meta = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return {meta, body: markdown.slice(match ? match[0].length : 0)};
}
function inline(source) {
  return esc(source)
    .replace(/!\[([^\]]*)\]\((\S+)\)/g, (_all, alt, url) => {
      const src = safeUrl(url.replaceAll('&amp;', '&'));
      return src ? '<img loading="lazy" src="' + esc(src) + '" alt="' + alt + '">' : '';
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, label, url) => {
      const href = safeUrl(url.replaceAll('&amp;', '&'));
      return href ? '<a href="' + esc(href) + '" rel="noopener noreferrer">' + label + '</a>' : label;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
function renderMarkdown(source) {
  const parts = []; let list = '';
  const close = () => { if (list) { parts.push('</' + list + '>'); list = ''; } };
  for (const row of source.split(/\r?\n/)) {
    const line = row.trim();
    if (!line) { close(); continue; }
    const ordered = /^\d+\.\s/.test(line), unordered = /^[-*]\s/.test(line);
    if (ordered || unordered) {
      const kind = ordered ? 'ol' : 'ul';
      if (kind !== list) { close(); list = kind; parts.push('<' + kind + '>'); }
      parts.push('<li>' + inline(line.replace(ordered ? /^\d+\.\s/ : /^[-*]\s/, '')) + '</li>');
      continue;
    }
    close();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) parts.push('<h' + heading[1].length + '>' + inline(heading[2]) + '</h' + heading[1].length + '>');
    else if (/^!\[/.test(line)) parts.push('<p class="inline-image">' + inline(line) + '</p>');
    else parts.push('<p>' + inline(line) + '</p>');
  }
  close(); return parts.join('\n');
}
function videoBlock(value) {
  const input = safeUrl(value);
  if (!input) return '';
  const u = new URL(input);
  let id = '';
  if (['youtu.be','www.youtu.be'].includes(u.hostname)) id = u.pathname.slice(1).split('/')[0];
  if (['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) {
    id = u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : (u.searchParams.get('v') || '');
  }
  if (/^[\w-]{11}$/.test(id)) {
    return '<section class="video"><h2>Produktvideo</h2><p>Mit dem Abspielen wird eine Verbindung zu YouTube hergestellt. Es gilt die Datenschutzerklärung von Google.</p><button type="button" data-youtube="' + esc(id) + '">YouTube-Video laden und abspielen ▶</button></section>';
  }
  if (/\.mp4(?:[?#]|$)/i.test(input)) {
    return '<section class="video"><h2>Produktvideo</h2><video controls preload="none" playsinline src="' + esc(input) + '"></video></section>';
  }
  return '';
}
function affiliate(value) {
  const href = safeUrl(value);
  if (!href) return '';
  const host = new URL(href).hostname.toLowerCase();
  if (!['link.amazon','amzn.to','amazon.de','www.amazon.de','amazon.com','www.amazon.com','amazon.co.uk','www.amazon.co.uk'].includes(host)) return '';
  return '<aside class="affiliate"><strong>Werbung · Amazon-Partnerlink</strong><p>Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.</p><a href="' + esc(href) + '" target="_blank" rel="sponsored nofollow noopener noreferrer">Bei Amazon ansehen ↗</a></aside>';
}
function articleHTML(filename, source) {
  const {meta, body} = parse(source);
  const slug = filename.replace(/\.md$/,'');
  const url = BASE + '/beitraege/' + encodeURIComponent(slug) + '.html';
  const heading = meta.title || slug;
  const desc = meta.summary || 'Gaming, Hardware und PC-Tipps bei GAMERHERZ';
  const cover = safeUrl(meta.image);
  const coverHTML = cover ? '<img class="cover" src="' + esc(cover) + '" alt="' + esc(heading) + '">' : '';
  const schema = JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:heading,description:desc,datePublished:meta.date || undefined,mainEntityOfPage:url,publisher:{'@type':'Organization',name:'GAMERHERZ',url:BASE+'/'}}).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)} | GAMERHERZ</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(heading)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><script type="application/ld+json">${schema}</script><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 85% 0%,#123b6955,transparent 38%),#080d19;color:#f3f8ff;font:16px/1.75 system-ui,Arial,sans-serif}a{color:#70d1ff}header{border-bottom:1px solid #26364b;background:#080d19}nav{max-width:1050px;margin:auto;padding:17px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px}.brand{font-size:24px;font-weight:900;letter-spacing:-1px;text-decoration:none;color:#fff}.brand span{color:#20c9ff}main{max-width:900px;margin:45px auto 70px;padding:0 20px}.post{background:#111b2c;border:1px solid #2c4460;border-radius:20px;padding:clamp(22px,5vw,52px)}h1{font-size:clamp(32px,5vw,46px);line-height:1.2}h2{color:#a9deff;margin-top:1.8em}.sub{color:#a9b8ca}.tag{font-size:12px;color:#69d7ff;font-weight:800;letter-spacing:1px;text-transform:uppercase}p,li{overflow-wrap:break-word}.cover,.post img,.video video{max-width:100%;height:auto;border-radius:12px}.cover{width:100%;max-height:430px;object-fit:cover}.video{margin-top:30px}.video button{border:0;border-radius:10px;padding:13px 18px;background:#20c9ff;color:#051222;font-weight:800;cursor:pointer}.video iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:12px}.affiliate{margin-top:35px;padding:20px;background:#0b263a;border:1px solid #356284;border-radius:14px}.affiliate p{font-size:13px;color:#cad9e6}.affiliate a{display:inline-block;padding:9px 18px;background:#20c9ff;color:#03111f;border-radius:8px;font-weight:bold;text-decoration:none}footer{text-align:center;padding:25px;border-top:1px solid #26364b;color:#9cacc3;font-size:14px}footer a{color:#9cacc3}</style></head><body><header><nav><a class="brand" href="/">GAMER<span>HERZ</span></a><a href="/artikel.html">← Alle Artikel</a></nav></header><main><article class="post"><span class="tag">${esc(meta.category || 'Gaming')}</span><p class="sub">${esc(meta.date || '')}</p><h1>${esc(heading)}</h1><p class="sub">${esc(desc)}</p>${coverHTML}${renderMarkdown(body)}${videoBlock(meta.video_url)}${affiliate(meta.amazon_link)}</article></main><footer>GAMERHERZ · Technik mit Leidenschaft · <a href="/kontakt.html">Kontakt</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/affiliate-hinweis.html">Affiliate-Hinweis</a></footer><script>document.querySelectorAll('[data-youtube]').forEach(b=>b.addEventListener('click',()=>{const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+b.dataset.youtube+'?autoplay=1';f.title='YouTube-Produktvideo';f.allow='accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture';f.allowFullscreen=true;b.closest('.video').replaceChildren(f)}));</script></body></html>`;
}
const files = fs.readdirSync(SOURCE).filter(n => n.endsWith('.md')).sort();
fs.mkdirSync(path.join(DEST,'beitraege'),{recursive:true});
for (const filename of files) fs.writeFileSync(path.join(DEST,'beitraege',filename.replace(/\.md$/,'.html')),articleHTML(filename,fs.readFileSync(path.join(SOURCE,filename),'utf8')),'utf8');
const staticPages = ['/','/artikel.html','/kontakt.html','/impressum.html','/datenschutz.html','/affiliate-hinweis.html'];
const urls = [...staticPages,...files.map(f=>'/beitraege/'+f.replace(/\.md$/,'.html'))];
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u=>'  <url><loc>'+BASE+u+'</loc></url>').join('\n')+'\n</urlset>\n';
fs.writeFileSync(path.join(DEST,'sitemap.xml'),xml,'utf8');
console.log('Generated',files.length,'SEO article pages and sitemap');
