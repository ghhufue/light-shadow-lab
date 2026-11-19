(() => {
  const get = id => document.getElementById(id);
  const stage = get('stage');
  const stageStatus = get('stage-status');
  const slider = get('slider');
  const play = get('play');
  const dial = get('dial');
  const lightSlider = get('light-slider');
  const lightDial = get('light-dial');
  const bodyLength = get('body-length');
  const shadowLength = get('shadow-length');
  const links = document.querySelectorAll('nav a[data-scene]');
  const sceneKeys = Object.keys(scenes);
  const autoPlay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = Object.fromEntries(sceneKeys.map(key => [
    key, {
      playing: autoPlay, time: 0, value: scenes[key].start, tail: null,
      lightX: scenes[key].light?.start,
    },
  ]));
  const formatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let activeScene;
  let previousFrame;
  let frameRequest = 0;

  function formatNumber(value) {
    return formatter.format(Math.abs(value) < 0.00005 ? 0 : value);
  }

  function setStageStatus(message, loading = false) {
    stageStatus.textContent = message;
    stageStatus.hidden = !message;
    stage.setAttribute('aria-busy', String(loading));
    play.disabled = slider.disabled = Boolean(message);
    lightSlider.disabled = !activeScene.scene.light || Boolean(message);
  }

  function updateButton() {
    play.textContent = activeScene.state.playing ? 'Ⅱ  暂停' : '▶  继续播放';
  }

  function render() {
    const { key, scene, state, indicators, draw } = activeScene;
    const value = state.value;
    let frame = state.time;
    let status;
    let lengths;
    let lengthLabels;
    if (key === 'walk') {
      dial.textContent = `${formatNumber(value)} u`;
      status = Math.abs(value) < 0.005 ? 1 : value < 0 ? 0 : 2;
    } else {
      if (scene.light) {
        lengths = sceneMotion.rodProjection(value, state.lightX);
        frame = lengths;
        lightSlider.value = String(state.lightX);
        lightDial.textContent = `${formatNumber(state.lightX)} u`;
        lightSlider.setAttribute('aria-valuetext', lightDial.textContent);
      } else {
        // The pre-rendered rotation SVGs use 10 seconds for the full slider range.
        frame = Math.min(9.999999, value / scene.limit * 10);
        lengths = sceneMotion.projection(key, value);
        const relative = lengths.projected / lengths.original;
        status = relative < 1e-6 ? 3 : Math.abs(relative - 1) < 1e-6 ? 1 : relative > 1 ? 0 : 2;
      }
      dial.textContent = `${value.toFixed(1)}°`;
    }
    if (scene.showLengths) {
      lengthLabels = {
        rod: `${formatNumber(lengths.original)} u`,
        shadow: `${formatNumber(lengths.projected)} u`,
      };
      bodyLength.textContent = lengthLabels.rod;
      shadowLength.textContent = lengthLabels.shadow;
    }
    draw?.(frame, lengthLabels);
    slider.value = String(value);
    slider.setAttribute('aria-valuetext', dial.textContent);
    for (const [index, indicator] of indicators.entries()) {
      indicator.classList.toggle('active', index === status);
    }
  }

  function frame(now) {
    const { key, state } = activeScene;
    const elapsed = previousFrame === undefined ? 0 : Math.min((now - previousFrame) / 1000, 0.15);
    previousFrame = now;
    sceneMotion.advance(key, state, elapsed);
    render();
    frameRequest = requestAnimationFrame(frame);
  }

  function schedulePlayback() {
    cancelAnimationFrame(frameRequest);
    previousFrame = undefined;
    frameRequest = activeScene.draw && activeScene.state.playing ? requestAnimationFrame(frame) : 0;
  }

  function showSceneDetails(key, scene) {
    for (const link of links) {
      if (link.dataset.scene === key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const pad = value => String(value).padStart(2, '0');
    get('index').textContent = `实验 ${pad(sceneKeys.indexOf(key) + 1)} / ${pad(sceneKeys.length)}`;
    get('title').textContent = scene.title;
    get('description').textContent = scene.description;
    get('slider-label').textContent = scene.parameter;
    get('measure').hidden = !scene.showLengths;
    slider.min = String(scene.start);
    slider.max = String(scene.limit);
    slider.step = String(scene.step);
    get('light-slider-wrap').hidden = lightDial.hidden = !scene.light;
    if (scene.light) {
      const { min, max, step } = scene.light;
      lightSlider.min = String(min);
      lightSlider.max = String(max);
      lightSlider.step = String(step);
    }

    const legend = [
      ['光线', '#aa660c', true],
      [scene.term, '#2378c7', false],
      ['地面投影', '#087e6a', false],
      [key === 'walk' ? '灯的正下方' : '旋转轴', '#435871', true],
    ];
    get('legend').replaceChildren(...legend.map(([title, color, dashed]) => {
      const item = document.createElement('span');
      const sample = document.createElement('i');
      sample.setAttribute('aria-hidden', 'true');
      sample.classList.toggle('dash', dashed);
      sample.style.setProperty('--sample', color);
      item.append(sample, title);
      return item;
    }));

    const indicators = (scene.states ?? []).map(title => {
      const item = document.createElement('span');
      item.textContent = title;
      return item;
    });
    const states = get('states');
    states.replaceChildren(...indicators);
    states.hidden = !indicators.length;
    return indicators;
  }

  async function switchScene() {
    const hash = location.hash.slice(1);
    const key = sceneKeys.includes(hash) ? hash : 'rod';
    if (key === activeScene?.key) return;

    const scene = scenes[key];
    const view = { key, scene, state: motion[key], indicators: showSceneDetails(key, scene), draw: null };
    activeScene = view;
    schedulePlayback();
    stage.replaceChildren();
    setStageStatus('正在加载演示…', true);
    updateButton();
    render();

    try {
      const template = await svgStage.load(key);
      if (view !== activeScene) return;
      view.draw = svgStage.mount(stage, template, {
        createRenderer: scene.light ? createMovingLightRenderer : undefined,
        showLengths: scene.showLengths,
      });
      setStageStatus('');
      render();
      schedulePlayback();
    } catch (error) {
      if (view !== activeScene) return;
      stage.replaceChildren();
      setStageStatus('演示加载失败，请刷新页面重试。');
      console.error(error);
    }
  }

  function pauseAndRender() {
    activeScene.state.playing = false;
    updateButton();
    schedulePlayback();
    render();
  }

  slider.addEventListener('input', () => {
    const { key, state } = activeScene;
    sceneMotion.seek(key, state, Number(slider.value));
    pauseAndRender();
  });

  lightSlider.addEventListener('input', () => {
    activeScene.state.lightX = Number(lightSlider.value);
    pauseAndRender();
  });

  play.addEventListener('click', () => {
    const { state } = activeScene;
    state.playing = !state.playing;
    updateButton();
    schedulePlayback();
  });

  addEventListener('hashchange', switchScene);
  switchScene();
})();
