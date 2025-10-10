import { track } from '../lib/analytics';

export default function ShareBar({ url, title }) {
  const encoded = encodeURIComponent;
  const links = [
    { name: 'X',        href: `https://twitter.com/intent/tweet?url=${encoded(url)}&text=${encoded(title)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded(url)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/shareArticle?mini=true&url=${encoded(url)}&title=${encoded(title)}` },
    { name: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${encoded(title)}%20${encoded(url)}` },
  ];
  function click(name) {
    track('share_click', { network: name, url });
  }
  return (
    <div style={{ position: 'sticky', top: 68, border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Share</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {links.map(l => (
          <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" onClick={()=>click(l.name)}>
            {l.name}
          </a>
        ))}
      </div>
    </div>
  );
}
