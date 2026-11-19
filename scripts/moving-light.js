function createMovingLightRenderer(svg) {
  const select = selector => svg.querySelector(selector);
  const selectAll = selector => Array.from(svg.querySelectorAll(selector));

  // Keep world geometry in scene units until the final orthographic projection.
  const toScreen = ([x, y, z = 0]) => [
    451 + x * 60 - y * 24,
    467 + x * 12.85 + y * 32 - z * 62.8,
  ];
  const line = (start, end) => `M${start}L${end}`;
  const polygon = points => `M${points.join('L')}Z`;
  const setPath = (element, path) => element.setAttribute('d', path);
  const setCenter = (element, [x, y]) => {
    element.setAttribute('cx', x);
    element.setAttribute('cy', y);
  };

  const halfWidth = 5.4;
  const halfDepth = 2.8;
  const [backLeft, backRight, frontRight, frontLeft] = [
    [-halfWidth, -halfDepth], [halfWidth, -halfDepth],
    [halfWidth, halfDepth], [-halfWidth, halfDepth],
  ].map(toScreen);
  const below = ([x, y]) => [x, y + 9];
  setPath(select('.ground-top'), polygon([backLeft, backRight, frontRight, frontLeft]));
  setPath(select('.ground-side'), polygon([backRight, frontRight, below(frontRight), below(backRight)]));
  setPath(select('.ground-front'), polygon([frontRight, frontLeft, below(frontLeft), below(frontRight)]));

  const grid = [];
  for (let x = -5; x <= 5; x += 0.5) {
    grid.push(line(toScreen([x, -halfDepth]), toScreen([x, halfDepth])));
  }
  for (let y = -2.5; y <= 2.5; y += 0.5) {
    grid.push(line(toScreen([-halfWidth, y]), toScreen([halfWidth, y])));
  }
  setPath(select('.ground-grid'), grid.join(''));

  const { height } = motionData.rod;
  const origin = toScreen([0, 0]);
  const pivot = toScreen([0, 0, height]);
  const axisStart = toScreen([0, -1.36, height]);
  const axisEnd = toScreen([0, 1.36, height]);
  setPath(select('.pivot-guide'), line(origin, pivot));
  setPath(select('.rotation-axis'), line(axisStart, axisEnd));
  setCenter(select('.pivot-foot'), origin);
  setCenter(select('.axis-start'), axisStart);
  setCenter(select('.axis-end'), axisEnd);
  select('.rod-pivot').setAttribute('transform', `translate(${pivot})`);

  const lightSource = select('.light-source');
  const groundShadow = select('#ground-shadow');
  const rodLines = selectAll('.rod-line');
  const rays = selectAll('.light-ray');
  const vertices = selectAll('.vertex');
  const shadowDots = selectAll('.shadow-dot');

  return ({ light, endpoints, shadows }) => {
    const lamp = toScreen(light);
    const rod = endpoints.map(toScreen);
    const shadow = shadows.map(toScreen);
    const rodPath = line(...rod);
    lightSource.setAttribute('transform', `translate(${lamp})`);
    setPath(groundShadow, line(...shadow));
    for (const element of rodLines) setPath(element, rodPath);
    for (const [index, ray] of rays.entries()) {
      setPath(ray, line(lamp, shadow[index]));
      setCenter(vertices[index], rod[index]);
      setCenter(shadowDots[index], shadow[index]);
    }
  };
}
