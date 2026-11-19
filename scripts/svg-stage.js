const svgStage = (() => {
  const namespace = 'http://www.w3.org/2000/svg';
  const templates = new Map();
  const loads = new Map();

  function register(key, markup) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    templates.set(key, template);
  }

  function load(key) {
    if (templates.has(key)) return Promise.resolve(templates.get(key));
    if (loads.has(key)) return loads.get(key);

    // Classic scripts also work when index.html is opened from disk.
    const script = document.createElement('script');
    script.src = `assets/scenes/${key}.svg.js`;
    const pending = new Promise((resolve, reject) => {
      script.onload = () => resolve(templates.get(key));
      script.onerror = reject;
    }).then(template => {
      if (!template?.content.querySelector('svg')) throw new Error(`Missing SVG for ${key}`);
      return template;
    }).catch(error => {
      templates.delete(key);
      throw error;
    }).finally(() => {
      loads.delete(key);
      script.remove();
    });
    loads.set(key, pending);
    document.head.append(script);
    return pending;
  }

  function createLabel(parent, vertex, index, shadow) {
    const stem = document.createElementNS(namespace, 'path');
    stem.setAttribute('class', 'point-stem');
    stem.setAttribute('stroke', shadow ? '#086754' : '#143f75');
    const text = document.createElementNS(namespace, 'text');
    text.setAttribute('class', `point-label ${shadow ? 'point-shadow' : 'point-rod'}`);
    text.textContent = String.fromCharCode(65 + index) + (shadow ? '′' : '');
    parent.append(stem, text);
    return { stem, text, vertex, shadow };
  }

  function addLabels(svg) {
    const overlay = document.createElementNS(namespace, 'g');
    overlay.setAttribute('aria-hidden', 'true');
    const labels = [
      ...Array.from(svg.querySelectorAll('.vertex'), (vertex, index) => createLabel(overlay, vertex, index, false)),
      ...Array.from(svg.querySelectorAll('.shadow-dot'), (vertex, index) => createLabel(overlay, vertex, index, true)),
    ];
    if (labels.length) svg.append(overlay);
    return labels;
  }

  function drawLabels(bounds, labels) {
    const circles = labels.map(({ vertex }) => {
      const style = getComputedStyle(vertex);
      return { x: parseFloat(style.cx), y: parseFloat(style.cy) };
    });
    if (!circles.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) return;

    const occupied = [];
    for (const [index, label] of labels.entries()) {
      const { x, y } = circles[index];
      const horizontal = index % 2 === 0 ? -1 : 1;
      const vertical = label.shadow ? 1 : -1;
      const candidates = [
        [18 * horizontal, 18 * vertical], [-18 * horizontal, 18 * vertical], [0, 24 * vertical],
        [27 * horizontal, 0], [-27 * horizontal, 0], [18 * horizontal, -20 * vertical], [0, 42 * vertical],
        [33 * horizontal, 24 * vertical], [-33 * horizontal, 24 * vertical], [0, -34 * vertical],
      ];
      const spots = candidates.map(([dx, dy]) => [
        Math.max(bounds.x + 16, Math.min(bounds.x + bounds.width - 16, x + dx)),
        Math.max(bounds.y + 13, Math.min(bounds.y + bounds.height - 13, y + dy)),
      ]);
      const penalty = ([xPos, yPos]) =>
        circles.filter(mark => Math.hypot(mark.x - xPos, mark.y - yPos) < 14).length * 40
        + occupied.filter(mark => Math.abs(mark[0] - xPos) < 26 && Math.abs(mark[1] - yPos) < 20).length * 60;
      const [xPos, yPos] = spots.reduce((best, spot) => penalty(spot) < penalty(best) ? spot : best);
      occupied.push([xPos, yPos]);
      label.text.setAttribute('x', xPos);
      label.text.setAttribute('y', yPos);
      const stemX = x + (xPos - x) * 0.58;
      const stemY = y + (yPos - y) * 0.58;
      label.stem.setAttribute('d', `M${x},${y}L${stemX},${stemY}`);
    }
  }

  function createTimelineRenderer(svg) {
    svg.pauseAnimations();
    return time => svg.setCurrentTime(time);
  }

  function mount(stage, template, createRenderer = createTimelineRenderer) {
    const svg = template.content.querySelector('svg').cloneNode(true);
    const labels = addLabels(svg);
    stage.replaceChildren(svg);
    const draw = createRenderer(svg);

    return frame => {
      draw(frame);
      if (labels.length) drawLabels(svg.viewBox.baseVal, labels);
    };
  }

  return { register, load, mount };
})();
