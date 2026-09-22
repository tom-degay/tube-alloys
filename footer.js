/* Shared site footer, defined once here and appended to every page.

   Appended as a sibling of <main>, straight after it -- not inside it --
   so its width can match the nav bar consistently across every page,
   independent of each page's own main max-width. (Previously it lived
   inside main specifically to inherit that page's width, which needed
   page-aware placement logic for the three approach pages' .side-rail;
   that's moot now the footer always lands after main regardless of that
   page's internal layout.)

   Styling lives in styles.css (.site-footer*), including the fly-out
   arrow, which is the shared a[target="_blank"] effect extended to
   .site-footer-links so the internal Contact link gets one too.

   Trade-off: with JS disabled the footer does not render. Every link in
   it is reachable elsewhere -- Contact from the nav, LinkedIn and the
   CV from the about and contact pages. */
(function () {
  if (document.querySelector('.site-footer')) return;   // never append twice
  var main = document.querySelector('main');
  if (!main || !main.parentNode) return;

  var hr = document.createElement('hr');
  hr.className = 'rule';

  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML =
    '<p class="site-footer-copy">&copy; 2026 Tom de Gay</p>' +
    '<p class="site-footer-links">' +
      '<a href="/contact">Contact</a>' +
      '<a href="https://www.linkedin.com/in/tom-dg/" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="/TomdeGayCV.pdf" download="Tom de Gay - CV.pdf" target="_blank" rel="noopener noreferrer">Download CV</a>' +
    '</p>';

  main.after(hr, footer);
})();
