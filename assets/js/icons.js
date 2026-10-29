// Fach-Piktogramme aus dem HBS-Schulcurriculum (assets/fachbereiche.js, v1.11.0), Ids auf dieses Projekt umgestellt
// (Entscheidung 88). Ein Linienstil 24×24, Strich 1,5, Farbe über currentColor. Nutzung: window.fachIcon(id) → SVG-Markup.
window.FACH_ICONS = {
  deutsch: '<path d="M12 7c-1.4-1.3-3.4-1.9-6.5-1.9v13c3.1 0 5.1.6 6.5 1.9 1.4-1.3 3.4-1.9 6.5-1.9v-13c-3.1 0-5.1.6-6.5 1.9z"/><path d="M12 7v13"/><path d="M8 9.5h2.2M8 12h2.2M8 14.5h2.2M13.8 9.5H16M13.8 12H16M13.8 14.5H16" stroke-width="1.1"/>',
  englisch: '<path d="M12 2.5v2"/><path d="M9.5 8.5L12 4.5l2.5 4"/><path d="M9.5 8.5h5"/><path d="M9.5 8.5v12M14.5 8.5v12"/><path d="M8 20.5h8"/><circle cx="12" cy="11.6" r="2.1"/><path d="M12 10.4v1.2l.9.6" stroke-width="1.1"/><path d="M10.7 15.5h2.6M10.7 17.7h2.6" stroke-width="1.1"/>',
  franz: '<path d="M12 2.5v2.2"/><path d="M12 4.7c-.4 4.8-2.2 9.3-6.8 15.3"/><path d="M12 4.7c.4 4.8 2.2 9.3 6.8 15.3"/><path d="M4 20.5h16"/><path d="M8.7 13.6h6.6"/><path d="M10.2 8.9h3.6"/><path d="M8.7 13.6c1 2.2 5.6 2.2 6.6 0"/><path d="M9.3 17.5c1.2-1 4.2-1 5.4 0" stroke-width="1.1"/>',
  span: '<path d="M3 20.5h18"/><path d="M4.5 20.5v-8.5c0-2.4.6-4.2 1.2-5.2.6 1 1.2 2.8 1.2 5.2v8.5"/><path d="M8.5 20.5V8.5c0-2.8.7-5 1.4-6.2.7 1.2 1.4 3.4 1.4 6.2v12"/><path d="M12.7 20.5V8.5c0-2.8.7-5 1.4-6.2.7 1.2 1.4 3.4 1.4 6.2v12"/><path d="M17.1 20.5v-8.5c0-2.4.6-4.2 1.2-5.2.6 1 1.2 2.8 1.2 5.2v8.5"/><path d="M9.9 1.6V.9M14.1 1.6V.9M5.7 6.1v-.7M18.3 6.1v-.7" stroke-width="1.1"/><path d="M9.2 11.5h1.4M9.2 14.5h1.4M13.4 11.5h1.4M13.4 14.5h1.4M5 14.5h1.4M17.6 14.5h1.4" stroke-width="1.1"/><path d="M7 18h10" stroke-width="1.1"/>',
  kunst: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2.1-.9 2.1-1.8 0-.8-.5-1.1-.5-1.8 0-.9.7-1.5 1.6-1.5h1.7a3.9 3.9 0 0 0 3.9-3.9C20.8 7.4 16.9 3.5 12 3.5z"/><circle cx="7.6" cy="11.5" r="1.1"/><circle cx="9.6" cy="7.6" r="1.1"/><circle cx="14" cy="6.8" r="1.1"/><circle cx="17.2" cy="10" r="1.1"/>',
  musik: '<path d="M9.5 18V6.5L19 4v11"/><circle cx="6.75" cy="18" r="2.75"/><circle cx="16.25" cy="15" r="2.75"/><path d="M9.5 9.5L19 7" stroke-width="1.1"/>',
  powi: '<path d="M3.5 20.5h17"/><path d="M5 20.5V12h14v8.5"/><path d="M4 12h16"/><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0z"/><path d="M12 4v-1.5"/><path d="M8 20.5V15M12 20.5V15M16 20.5V15"/>',
  geschichte: '<path d="M3.5 20.5h17"/><path d="M5 18h14"/><path d="M6.5 18V9.5M10.2 18V9.5M13.8 18V9.5M17.5 18V9.5"/><path d="M5 9.5h14"/><path d="M4 9.5L12 4l8 5.5"/><path d="M5.6 8.2h1.8M9.3 8.2h1.8M13 8.2h1.8M16.6 8.2h1.8" stroke-width="1.1"/>',
  geo: '<circle cx="12" cy="12" r="8.75"/><path d="M3.25 12h17.5"/><path d="M12 3.25c2.9 2.4 4.2 5.4 4.2 8.75s-1.3 6.35-4.2 8.75c-2.9-2.4-4.2-5.4-4.2-8.75s1.3-6.35 4.2-8.75z"/><path d="M4.8 7.8h14.4M4.8 16.2h14.4" stroke-width="1.1"/>',
  religion: '<path d="M12 3v18"/><path d="M6.5 8.5h11"/>',
  ethik: '<path d="M12 4.5v15.5"/><path d="M8 20h8"/><path d="M4.5 7.5h15"/><circle cx="12" cy="4.5" r="1.2"/><path d="M6 7.5l-2.7 6.2a3 3 0 0 0 5.4 0z"/><path d="M18 7.5l-2.7 6.2a3 3 0 0 0 5.4 0z"/>',
  mathe: '<path d="M12 4.5v2.5"/><path d="M12 7l-6.3 12.5"/><path d="M12 7l6.3 12.5"/><path d="M8.4 14.2h7.2"/><circle cx="12" cy="4.5" r="1.4"/><path d="M5.7 19.5l-.6 1.5M18.3 19.5l.6 1.5" stroke-width="1.1"/>',
  biologie: '<path d="M5 19.5c0-8.5 4.5-13.5 14.5-14.5-1 10-6 14.5-14.5 14.5z"/><path d="M5 19.5l8.5-8.5"/><path d="M9.5 15.2c2-.2 3.7-.6 5-1.4M11.6 12.9c1.8-.5 3.2-1.2 4.4-2.1" stroke-width="1.1"/>',
  chemie: '<path d="M9 3.5h6"/><path d="M10 3.5v5.8L4.7 18.4A1.6 1.6 0 0 0 6.1 21h11.8a1.6 1.6 0 0 0 1.4-2.6L14 9.3V3.5"/><path d="M6.9 15.5h10.2"/><circle cx="10" cy="18" r=".9" stroke-width="1.1"/><circle cx="13.5" cy="17" r=".7" stroke-width="1.1"/>',
  physik: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.4"/><ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(120 12 12)"/><circle cx="3.6" cy="10.2" r=".9" fill="currentColor" stroke="none"/><circle cx="17.5" cy="4.6" r=".9" fill="currentColor" stroke="none"/>',
  info: '<path d="M8 7.5L3.5 12 8 16.5"/><path d="M16 7.5l4.5 4.5-4.5 4.5"/><path d="M13.6 4.5l-3.2 15"/>',
  sport: '<circle cx="15.8" cy="4.6" r="1.9"/><path d="M14.2 8.4l-2.5 4.4 3.4 2.3 1.3 5.4"/><path d="M11.7 12.8l-4.2 1.9-1.2 4.3"/><path d="M14.2 8.4l-3.4-.5-2.7 2.3"/><path d="M14.2 8.4l3.9 2.3 2.6-1.7"/>',
};
window.FACH_ICONS.mathematik = window.FACH_ICONS.mathe;   // Film-Id
window.fachIcon = function (id, cls) {
  var p = window.FACH_ICONS[id];
  if (!p) return '';
  return '<svg class="fach-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
};
