export function pushAd() {
  try {
    if (!window.adsbygoogle) window.adsbygoogle = [];
    window.adsbygoogle.push({});
  } catch (_) {}
}
