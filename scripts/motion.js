const sceneMotion = (() => {
  const thresholds = {
    rod: findThresholds(motionData.rod.frames),
    triangle: findThresholds(motionData.triangle.frames),
  };
  const walkFrames = motionData.walk.frames;
  const walkMidpoint = (walkFrames.length - 1) / 2;
  const walkOutbound = walkFrames.slice(0, walkMidpoint + 1);
  const walkReturn = walkFrames.slice(walkMidpoint);

  function findThresholds(frames) {
    return frames.filter(row => row[2] < 1e-8 || Math.abs(row[2] - 1) < 1e-8);
  }

  function sample(rows, key, result, value) {
    let start = 0;
    let end = rows.length - 1;
    const forward = rows[end][key] >= rows[start][key];
    if (forward ? value <= rows[start][key] : value >= rows[start][key]) return rows[start][result];
    if (forward ? value >= rows[end][key] : value <= rows[end][key]) return rows[end][result];
    while (end - start > 1) {
      const middle = Math.floor((start + end) / 2);
      if (forward ? rows[middle][key] < value : rows[middle][key] > value) start = middle;
      else end = middle;
    }
    const span = rows[end][key] - rows[start][key];
    if (!span) return rows[end][result];
    const fraction = (value - rows[start][key]) / span;
    return rows[start][result] + (rows[end][result] - rows[start][result]) * fraction;
  }

  function seek(key, state, value) {
    if (key === 'moving-light') {
      const { limit, rotationSpeed } = scenes[key];
      const legDuration = limit / rotationSpeed;
      state.time = state.time <= legDuration ? value / rotationSpeed : (2 * limit - value) / rotationSpeed;
      state.value = value;
      return;
    }

    const { duration, frames } = motionData[key];
    state.tail = null;
    if (key === 'walk') {
      const outbound = state.time < duration / 2;
      // At the lamp, seek to the middle of the stop on the current leg.
      state.time = Math.abs(value) < 1e-8
        ? duration * (outbound ? 0.25 : 0.75)
        : sample(outbound ? walkOutbound : walkReturn, 1, 0, value);
      state.value = value;
      return;
    }

    const threshold = thresholds[key].find(row => Math.abs(row[1] - value) <= 0.051);
    state.value = threshold ? threshold[1] : value;
    const lastAngle = frames.at(-1)[1];
    if (key === 'rod' && state.value > lastAngle) {
      // The slider extends beyond the last angle in the wood-rod timeline.
      state.tail = { value: state.value, elapsed: 0 };
      return;
    }
    if (Math.abs(state.value - lastAngle) < 1e-8) state.time = key === 'rod' ? 9 : duration;
    else state.time = sample(frames, 1, 0, state.value);
  }

  function advance(key, state, elapsed) {
    if (key === 'moving-light') {
      const { limit, rotationSpeed } = scenes[key];
      const cycle = 2 * limit / rotationSpeed;
      state.time = (state.time + elapsed) % cycle;
      state.value = Math.min(state.time, cycle - state.time) * rotationSpeed;
      return;
    }

    const { duration, frames } = motionData[key];
    if (state.tail) {
      state.tail.elapsed += elapsed;
      state.value = Math.min(scenes.rod.limit, state.tail.value + state.tail.elapsed * 32);
      if (state.value >= scenes.rod.limit) {
        state.tail = null;
        state.time = 0;
      }
    } else {
      state.time = (state.time + elapsed) % duration;
      state.value = sample(frames, 0, 1, state.time);
    }
  }

  function groundProjection([posX, posY, posZ], [east, north, height]) {
    const factor = height / (height - posZ);
    return [east + factor * (posX - east), north + factor * (posY - north)];
  }

  function rodProjection(value, east = motionData.rod.light[0]) {
    const { length, height, light: [, north, lightHeight] } = motionData.rod;
    const light = [east, north, lightHeight];
    const angle = value * Math.PI / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const half = length / 2;
    const endpoints = [-half, half].map(offset => [offset * cosine, 0, height + offset * sine]);
    const shadows = endpoints.map(point => groundProjection(point, light));
    const [first, second] = shadows;
    return {
      light,
      endpoints,
      shadows,
      projected: Math.hypot(second[0] - first[0], second[1] - first[1]),
      original: length,
    };
  }

  function projection(key, value) {
    if (key === 'rod') return rodProjection(value);
    const { base, height, light } = motionData[key];
    const angle = value * Math.PI / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const polygon = base.map(([offset, depth]) => groundProjection(
      [offset * cosine, depth, height + offset * sine], light,
    ));
    return { projected: area(polygon), original: area(base) };
  }

  function area([first, second, third]) {
    return Math.abs(
      (second[0] - first[0]) * (third[1] - first[1]) - (second[1] - first[1]) * (third[0] - first[0]),
    ) / 2;
  }

  return { seek, advance, projection, rodProjection };
})();
