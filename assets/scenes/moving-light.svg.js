svgStage.register('moving-light', String.raw`<svg xmlns="http://www.w3.org/2000/svg"
  width="928" height="575" viewBox="44 140 814 514" role="img" aria-labelledby="moving-light-title moving-light-desc">
  <title id="moving-light-title">移动点光源与木棒投影</title>
  <desc id="moving-light-desc">木棒绕中心转动。点光源保持高度，沿木棒所在的竖直平面左右移动。光线穿过木棒两端，落在地面上形成投影。</desc>
  <defs>
    <radialGradient id="moving-light-sky" cx="50%" cy="46%" r="66%">
      <stop stop-color="#fff"/>
      <stop offset="1" stop-color="#edf4fa"/>
    </radialGradient>
    <linearGradient id="moving-light-floor" x2="0%" y2="100%">
      <stop stop-color="#e8f1f9"/>
      <stop offset="1" stop-color="#dce9f3"/>
    </linearGradient>
    <radialGradient id="moving-light-halo">
      <stop stop-color="#ffcf64" stop-opacity=".48"/>
      <stop offset="1" stop-color="#ffb74e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <style>
    .moving-light-art .ground-grid { fill: none; stroke: #6489aa; stroke-opacity: .36; stroke-width: .8; }
    .moving-light-art .light-ray { fill: none; stroke: #aa660c; stroke-opacity: .76; stroke-width: 1.5; stroke-dasharray: 5 5; }
    .moving-light-art .rod-line, .moving-light-art .ground-shadow { fill: none; stroke-linecap: round; }
    .moving-light-art .vertex { fill: #f5fbff; stroke: #17629e; stroke-width: 1.2; }
    .moving-light-art .shadow-dot { fill: #0a9079; stroke: #eaf9f5; stroke-width: 1; }
    .moving-light-art .axis-tip { fill: #eff5fa; stroke: #435871; stroke-width: 1.15; }
  </style>
  <g class="moving-light-art">
    <rect x="44" y="140" width="814" height="514" rx="17" fill="url(#moving-light-sky)" stroke="#c9d8e5"/>
    <path class="ground-side" fill="#d6e5ef" stroke="#a1b8ca"/>
    <path class="ground-front" fill="#c8d9e7" stroke="#a1b8ca"/>
    <path class="ground-top" fill="url(#moving-light-floor)" stroke="#88a5bd" stroke-width="1.25"/>
    <path class="ground-grid"/>
    <path class="pivot-guide" fill="none" stroke="#496986" stroke-opacity=".36" stroke-dasharray="3 5"/>
    <circle class="pivot-foot" r="3" fill="#577693" opacity=".57"/>
    <path class="light-ray"/>
    <path class="light-ray"/>
    <path class="ground-shadow" id="ground-shadow" stroke="#087e6a" stroke-width="5"/>
    <circle class="shadow-dot" r="3.3"/>
    <circle class="shadow-dot" r="3.3"/>
    <path class="rotation-axis" stroke="#435871" stroke-width="1.65" stroke-dasharray="5 4"/>
    <circle class="axis-tip axis-start" r="3.3"/>
    <circle class="axis-tip axis-end" r="3.3"/>
    <path class="rod-line" stroke="#154f85" stroke-width="5"/>
    <path class="rod-line" id="rotating-body" stroke="#2378c7" stroke-width="4.2"/>
    <circle class="vertex" r="2"/>
    <circle class="vertex" r="2"/>
    <g class="rod-pivot">
      <circle r="6" fill="#fff" stroke="#193a5d" stroke-width="1.5"/>
      <circle r="1.7" fill="#193a5d"/>
    </g>
    <g class="light-source">
      <circle r="30" fill="url(#moving-light-halo)"/>
      <circle r="10.5" fill="none" stroke="#bd7b19" stroke-opacity=".72"/>
      <circle r="5.7" fill="#efa530"/>
      <circle r="2.4" fill="#fff4bc"/>
      <text x="-22" y="4.5" text-anchor="end" fill="#8c4b03" font-family="system-ui, sans-serif" font-size="21">点光源</text>
    </g>
  </g>
</svg>`);
