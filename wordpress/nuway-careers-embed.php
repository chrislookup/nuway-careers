<?php
/**
 * Plugin Name: Nuway Careers Embed
 * Description: Adds the [nuway_careers] shortcode, which embeds the Nuway careers page (hosted on GitHub Pages or /careers/) with automatic height. Create a WordPress page at /careers and put [nuway_careers] in it.
 * Version: 1.0
 * Author: Nuway
 */
if (!defined('ABSPATH')) exit;

add_shortcode('nuway_careers', function ($atts) {
  $a = shortcode_atts([
    // Final home of the app. While testing on GitHub Pages pass src="https://chrislookup.github.io/nuway-careers/careers/" in the shortcode.
    'src' => 'https://nuway.com.au/wp-content/uploads/careers/',
  ], $atts);
  $src = esc_url(rtrim($a['src'], '/') . '/?embed=1');
  $id = 'nuway-careers-' . wp_rand(1000, 9999);
  ob_start(); ?>
  <iframe id="<?php echo $id; ?>" src="<?php echo $src; ?>" title="Nuway Careers"
          style="width:100%;border:0;min-height:900px;display:block" scrolling="no" loading="eager"></iframe>
  <script>
  (function () {
    var f = document.getElementById('<?php echo $id; ?>');
    window.addEventListener('message', function (e) {
      if (!e.data) return;
      if (e.data.nuwayCareersHeight) f.style.height = (e.data.nuwayCareersHeight + 20) + 'px';
      if (e.data.nuwayCareersScrollTop) window.scrollTo({ top: f.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
    // pass the job deep-link hash through to the iframe
    if (location.hash) f.src = f.src + location.hash;
  })();
  </script>
  <?php return ob_get_clean();
});
