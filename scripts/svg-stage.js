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

  function createAnnotation(parent, type, shadow) {
    const stem = document.createElementNS(namespace, 'path');
    stem.setAttribute('class', `${type}-stem`);
    stem.setAttribute('stroke', shadow ? '#086754' : '#143f75');
    const text = document.createElementNS(namespace, 'text');
    text.setAttribute('class', `${type}-label ${shadow ? 'point-shadow' : 'point-rod'}`);
    parent.append(stem, text);
    return { stem, text };
  }

  function createPointLabel(parent, vertex, index, shadow) {
    const label = createAnnotation(parent, 'point', shadow);
    label.text.textContent = String.fromCharCode(65 + index) + (shadow ? '′' : '');
    return { ...label, vertex, shadow };
  }

  function addLabels(svg, showLengths) {
    const overlay = document.createElementNS(namespace, 'g');
    overlay.setAttribute('aria-hidden', 'true');
    const points = [
      ...Array.from(svg.querySelectorAll('.vertex'), (vertex, index) => createPointLabel(overlay, vertex, index, false)),
      ...Array.from(svg.querySelectorAll('.shadow-dot'), (vertex, index) => createPointLabel(overlay, vertex, index, true)),
    ];
    const lengths = showLengths ? {
      rod: createAnnotation(overlay, 'length', false),
      shadow: createAnnotation(overlay, 'length', true),
    } : null;
    if (points.length) svg.append(overlay);
    return { points, lengths };
  }

  function drawPointLabels(bounds, labels, circles) {
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
    return occupied;
  }

  function drawLengthLabels(bounds, labels, values, circles, occupied) {
    const halfWidth = 43;
    const halfHeight = 19;
    const obstacles = [
      ...circles.map(({ x, y }) => [x, y, 7, 7]),
      ...occupied.map(([x, y]) => [x, y, 14, 16]),
    ];
    for (const [index, key] of ['rod', 'shadow'].entries()) {
      const [first, second] = circles.slice(index * 2, index * 2 + 2);
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const span = Math.hypot(dx, dy);
      // Keep the shadow annotation below its midpoint even when the endpoints coincide.
      const [normalX, normalY] = key === 'rod' && span > 0 ? [dy / span, -dx / span] : [0, 1];
      const offset = Math.abs(normalX) * halfWidth + Math.abs(normalY) * halfHeight + 24;
      const farther = offset + 34;
      const candidates = [
        [normalX * offset, normalY * offset],
        [normalX * farther, normalY * farther],
        [-normalX * offset, -normalY * offset],
        [-normalX * farther, -normalY * farther],
      ].map(([x, y]) => [
        Math.max(bounds.x + halfWidth, Math.min(bounds.x + bounds.width - halfWidth, midX + x)),
        Math.max(bounds.y + halfHeight, Math.min(bounds.y + bounds.height - halfHeight, midY + y)),
      ]);
      const conflicts = ([x, y]) => obstacles.filter(([otherX, otherY, width, height]) =>
        Math.abs(x - otherX) < halfWidth + width && Math.abs(y - otherY) < halfHeight + height,
      ).length;
      const [x, y] = candidates.reduce((best, candidate) => conflicts(candidate) < conflicts(best) ? candidate : best);
      obstacles.push([x, y, halfWidth, halfHeight]);

      const label = labels[key];
      label.text.setAttribute('x', x);
      label.text.setAttribute('y', y);
      if (label.text.textContent !== values[key]) label.text.textContent = values[key];

      const shiftX = x - midX;
      const shiftY = y - midY;
      const distance = Math.hypot(shiftX, shiftY);
      const start = Math.min(1, 6 / distance);
      const end = 1 - 1 / Math.max(Math.abs(shiftX) / halfWidth, Math.abs(shiftY) / halfHeight);
      const path = end > start
        ? `M${midX + start * shiftX},${midY + start * shiftY}L${midX + end * shiftX},${midY + end * shiftY}`
        : '';
      label.stem.setAttribute('d', path);
    }
  }

  function drawLabels(bounds, { points, lengths }, values) {
    const circles = points.map(({ vertex }) => {
      const style = getComputedStyle(vertex);
      return { x: parseFloat(style.cx), y: parseFloat(style.cy) };
    });
    if (!circles.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) return;
    const occupied = drawPointLabels(bounds, points, circles);
    if (lengths && values) drawLengthLabels(bounds, lengths, values, circles, occupied);
  }

  function createTimelineRenderer(svg) {
    svg.pauseAnimations();
    return time => svg.setCurrentTime(time);
  }

  function mount(stage, template, { createRenderer = createTimelineRenderer, showLengths = false } = {}) {
    const svg = template.content.querySelector('svg').cloneNode(true);
    const labels = addLabels(svg, showLengths);
    stage.replaceChildren(svg);
    const draw = createRenderer(svg);

    return (frame, values) => {
      draw(frame);
      if (labels.points.length) drawLabels(svg.viewBox.baseVal, labels, values);
    };
  }

  return { register, load, mount };
})();
