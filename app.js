(() => {
  'use strict';

  const STORAGE_KEY_API = 'deadlineNavi.googleMapsApiKey';
  const STORAGE_KEY_NAVITIME = 'deadlineNavi.navitimeRapidApiKey';
  const STORAGE_KEY_FORM = 'deadlineNavi.formV05';
  const AUTO_NORMAL_INTERVAL_MS = 5 * 60_000;
  const AUTO_APPROACH_INTERVAL_MS = 3 * 60_000;
  const AUTO_CRITICAL_INTERVAL_MS = 60_000;
  const AUTO_NORMAL_DISTANCE_M = 5_000;
  const AUTO_APPROACH_DISTANCE_M = 3_000;
  const AUTO_CRITICAL_DISTANCE_M = 1_000;
  const AUTO_MIN_INTERVAL_MS = 60_000;
  const AUTO_APPROACH_THRESHOLD_MS = 30 * 60_000;
  const AUTO_CRITICAL_THRESHOLD_MS = 5 * 60_000;
  const NAV_GUIDANCE_RECALC_MS = 5 * 60_000;
  const NAV_GUIDANCE_SAMPLE_COUNT = 6;
  const NAV_GUIDANCE_PREPARE_MS = 15 * 60_000;
  const NAV_GUIDANCE_NOW_MS = 5 * 60_000;
  const NAVITIME_HOST = 'navitime-route-car.p.rapidapi.com';
  const NAVITIME_ROUTE_URL = `https://${NAVITIME_HOST}/route_car`;
  const NAVITIME_IC_URL = `https://${NAVITIME_HOST}/ic`;
  const NAVITIME_IC_SEARCH_RADIUS_M = 10_000;
  const NAVITIME_IC_SAMPLE_STEP_M = 18_000;
  const NAVITIME_IC_SEARCH_CONCURRENCY = 6;
  const NAVITIME_IC_CACHE = new Map();
  const NAVITIME_CONCURRENCY = 6;
  const CANDIDATE_CONCURRENCY = 6;
  const EXACT_CHECKPOINT_COUNT = 11;
  const ACTUAL_BOUNDARY_ANCHORS = 8;
  const BOUNDARY_PRICE_NEIGHBORS = 6;
  const PRICE_SENTINEL_LIMIT_V046 = 2;
  const RECOVERY_ROUTE_HORIZON_M = 140_000;
  const RECOVERY_IC_SAMPLE_STEP_M = 16_000;
  const RECOVERY_EXACT_LIMIT = 20;
  const RECOVERY_FARE_LIMIT = 7;
  const COARSE_SAMPLE_LIMIT = 10;
  const DETAIL_MATRIX_LIMIT = 14;
  const DETAIL_EXACT_LIMIT = 8;
  const FARE_CANDIDATE_LIMIT = 6;
  const PRICE_SENTINEL_LIMIT = 2;
  const INITIAL_CORRIDOR_KM = 18;
  const EXPANDED_CORRIDOR_KM = 32;
  const COVERAGE_BIN_COUNT = 8;
  const MIN_ROUTE_COVERAGE = 0.62;
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  const OVERPASS_MAX_SAMPLE_POINTS = 24;
  const OVERPASS_MIN_SAMPLE_STEP_KM = 42;
  const OSM_ROUTE_CACHE = new Map();

  const $ = (id) => document.getElementById(id);

  const els = {
    apiKey: $('apiKey'),
    saveApiKey: $('saveApiKey'),
    apiStatus: $('apiStatus'),
    googleDiag: $('googleDiag'),
    googleDiagResult: $('googleDiagResult'),
    navitimeApiKey: $('navitimeApiKey'),
    saveNavitimeApiKey: $('saveNavitimeApiKey'),
    navitimeStatus: $('navitimeStatus'),
    destination: $('destination'),
    arrivalDeadline: $('arrivalDeadline'),
    safetyMargin: $('safetyMargin'),
    useDebugNow: $('useDebugNow'),
    debugNow: $('debugNow'),
    setDebugNowReal: $('setDebugNowReal'),
    getLocation: $('getLocation'),
    locationText: $('locationText'),
    manualOrigin: $('manualOrigin'),
    calculate: $('calculate'),
    formError: $('formError'),
    resultSection: $('resultSection'),
    decisionCard: $('decisionCard'),
    decisionText: $('decisionText'),
    decisionSubtext: $('decisionSubtext'),
    localEta: $('localEta'),
    localDuration: $('localDuration'),
    fastEta: $('fastEta'),
    fastDuration: $('fastDuration'),
    timeSaved: $('timeSaved'),
    tollPrice: $('tollPrice'),
    slack: $('slack'),
    localDistance: $('localDistance'),
    fastDistance: $('fastDistance'),
    deadlineDisplay: $('deadlineDisplay'),
    marginDisplay: $('marginDisplay'),
    calculatedAt: $('calculatedAt'),
    recalculate: $('recalculate'),
    candidateStatus: $('candidateStatus'),
    candidateCount: $('candidateCount'),
    candidateList: $('candidateList'),
    switchSummary: $('switchSummary'),
    switchModeLabel: $('switchModeLabel'),
    switchIc: $('switchIc'),
    switchRoad: $('switchRoad'),
    switchArrival: $('switchArrival'),
    switchDeadline: $('switchDeadline'),
    switchRemaining: $('switchRemaining'),
    navChangeAdvice: $('navChangeAdvice'),
    switchDestinationEta: $('switchDestinationEta'),
    switchToll: $('switchToll'),
    autoStart: $('autoStart'),
    autoStop: $('autoStop'),
    autoStatus: $('autoStatus'),
    voiceEnabled: $('voiceEnabled'),
    voiceTest: $('voiceTest'),
    voiceSelect: $('voiceSelect'),
    voiceStatus: $('voiceStatus'),
    monitorDetail: $('monitorDetail'),
  };

  let currentPosition = null;
  let mapsLoadPromise = null;
  let runtimeApiKey = '';
  let runtimeNavitimeApiKey = '';
  let persistentStorageAvailable = true;
  let calculationInFlight = false;
  let lastDecisionSnapshot = null;
  let retainedCandidate = null;
  let retainedCandidateDestination = '';
  const autoMonitor = {
    active: false,
    watchId: null,
    timerId: null,
    lastCalcAt: 0,
    lastCalcPosition: null,
    wakeLock: null,
  };

  init();

  function init() {
    restoreState();
    setDefaultDeadlineIfEmpty();
    refreshApiStatus();
    refreshNavitimeStatus();

    els.saveApiKey.addEventListener('click', saveApiKey);
    els.googleDiag?.addEventListener('click', diagnoseGoogleApi);
    els.saveNavitimeApiKey.addEventListener('click', saveNavitimeApiKey);
    els.getLocation.addEventListener('click', requestLocation);
    els.useDebugNow.addEventListener('change', () => { updateDebugControls(); persistFormState(); });
    els.setDebugNowReal.addEventListener('click', () => { els.debugNow.value = toLocalDateTimeInput(new Date()); els.useDebugNow.checked = true; updateDebugControls(); persistFormState(); });
    els.calculate.addEventListener('click', () => calculate({ source: 'manual' }));
    els.recalculate.addEventListener('click', () => calculate({ source: 'manual' }));
    els.autoStart.addEventListener('click', startAutoMonitor);
    els.autoStop.addEventListener('click', stopAutoMonitor);
    els.voiceTest.addEventListener('click', () => speakJapanese('音声案内のテストです。現在の設定で読み上げています。'));
    els.voiceEnabled.addEventListener('change', persistFormState);
    els.voiceSelect?.addEventListener('change', () => { persistFormState(); populateSpeechVoiceOptions(); });
    setupSpeechVoices();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    [els.destination, els.arrivalDeadline, els.safetyMargin, els.debugNow, els.manualOrigin].forEach((el) => {
      el.addEventListener('change', persistFormState);
    });
    updateDebugControls();
    updateAutoUi();
  }

  function restoreState() {
    const apiKey = safeStorageGet(STORAGE_KEY_API) || '';
    runtimeApiKey = apiKey;
    els.apiKey.value = apiKey;

    const navitimeKey = safeStorageGet(STORAGE_KEY_NAVITIME) || '';
    runtimeNavitimeApiKey = navitimeKey;
    els.navitimeApiKey.value = navitimeKey;

    try {
      const saved = JSON.parse(safeStorageGet(STORAGE_KEY_FORM) || '{}');
      if (saved.destination) els.destination.value = saved.destination;
      if (saved.arrivalDeadline) els.arrivalDeadline.value = saved.arrivalDeadline;
      if (Number.isFinite(saved.safetyMargin)) els.safetyMargin.value = saved.safetyMargin;
      if (typeof saved.useDebugNow === 'boolean') els.useDebugNow.checked = saved.useDebugNow;
      if (saved.debugNow) els.debugNow.value = saved.debugNow;
      if (saved.manualOrigin) els.manualOrigin.value = saved.manualOrigin;
      if (typeof saved.voiceEnabled === 'boolean') els.voiceEnabled.checked = saved.voiceEnabled;
      if (saved.voiceChoice && els.voiceSelect) els.voiceSelect.dataset.savedChoice = saved.voiceChoice;
    } catch (_) {
      // Ignore malformed local state.
    }
  }

  function persistFormState() {
    const payload = {
      destination: els.destination.value.trim(),
      arrivalDeadline: els.arrivalDeadline.value,
      safetyMargin: clampNumber(Number(els.safetyMargin.value), 0, 120, 10),
      useDebugNow: Boolean(els.useDebugNow.checked),
      debugNow: els.debugNow.value,
      manualOrigin: els.manualOrigin.value.trim(),
      voiceEnabled: Boolean(els.voiceEnabled?.checked),
      voiceChoice: els.voiceSelect?.value || 'auto-female',
    };
    safeStorageSet(STORAGE_KEY_FORM, JSON.stringify(payload));
  }

  function setDefaultDeadlineIfEmpty() {
    if (els.arrivalDeadline.value) return;
    const now = new Date();
    const target = new Date(now);
    target.setHours(15, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    els.arrivalDeadline.value = toLocalDateTimeInput(target);
  }

  function updateDebugControls() {
    const enabled = Boolean(els.useDebugNow.checked);
    els.debugNow.disabled = !enabled;
    if (enabled && !els.debugNow.value) els.debugNow.value = toLocalDateTimeInput(new Date());
  }

  function getReferenceNow() {
    if (!els.useDebugNow.checked) return { date: new Date(), simulated: false, trafficMode: 'live' };
    const parsed = new Date(els.debugNow.value);
    if (Number.isNaN(parsed.getTime())) throw new Error('デバッグ用の仮想現在時刻を入力してください。');
    const futureForGoogle = parsed.getTime() > Date.now() + 30_000;
    return {
      date: parsed,
      simulated: true,
      trafficMode: futureForGoogle ? 'future' : 'live-fallback',
    };
  }

  function applyFutureDepartureTime(request, date) {
    if (date instanceof Date && date.getTime() > Date.now() + 30_000) request.departureTime = date;
    return request;
  }

  function saveApiKey() {
    const key = els.apiKey.value.trim();
    if (!key) {
      runtimeApiKey = '';
      safeStorageRemove(STORAGE_KEY_API);
      mapsLoadPromise = null;
      refreshApiStatus();
      showError('APIキーが空です。');
      return;
    }

    runtimeApiKey = key;
    const persisted = safeStorageSet(STORAGE_KEY_API, key);
    mapsLoadPromise = null;
    refreshApiStatus();
    showError(persisted ? '' : 'Safariのローカルファイルでは永続保存できないため、このタブ内だけAPIキーを保持します。計算はそのまま利用できます。');
  }

  function getApiKey() {
    return runtimeApiKey || els.apiKey.value.trim() || safeStorageGet(STORAGE_KEY_API) || '';
  }

  function saveNavitimeApiKey() {
    const key = els.navitimeApiKey.value.trim();
    if (!key) {
      runtimeNavitimeApiKey = '';
      safeStorageRemove(STORAGE_KEY_NAVITIME);
      refreshNavitimeStatus();
      showError('X-RapidAPI-Key が空です。');
      return;
    }

    runtimeNavitimeApiKey = key;
    const persisted = safeStorageSet(STORAGE_KEY_NAVITIME, key);
    refreshNavitimeStatus();
    showError(persisted ? '' : 'Safariのローカルファイルでは永続保存できないため、このタブ内だけRapidAPIキーを保持します。');
  }

  function getNavitimeApiKey() {
    return runtimeNavitimeApiKey || els.navitimeApiKey.value.trim() || safeStorageGet(STORAGE_KEY_NAVITIME) || '';
  }

  function refreshNavitimeStatus() {
    const hasKey = Boolean(getNavitimeApiKey());
    if (!hasKey) {
      els.navitimeStatus.textContent = '未設定';
      els.navitimeStatus.className = 'badge badge-warn';
      return;
    }
    els.navitimeStatus.textContent = persistentStorageAvailable ? '設定済み' : '設定済み（このタブ）';
    els.navitimeStatus.className = 'badge badge-good';
  }

  function refreshApiStatus() {
    const hasKey = Boolean(getApiKey());
    if (!hasKey) {
      els.apiStatus.textContent = '未設定';
      els.apiStatus.className = 'badge badge-warn';
      return;
    }
    els.apiStatus.textContent = persistentStorageAvailable ? '設定済み' : '設定済み（このタブ）';
    els.apiStatus.className = 'badge badge-good';
  }

  async function requestLocation() {
    showError('');
    if (!navigator.geolocation) {
      showError('このブラウザは位置情報取得に対応していません。出発地を手入力してください。');
      return;
    }

    els.getLocation.disabled = true;
    els.getLocation.textContent = '取得中…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        els.locationText.textContent = `緯度 ${currentPosition.lat.toFixed(5)}, 経度 ${currentPosition.lng.toFixed(5)}（精度 約${Math.round(currentPosition.accuracy)}m）`;
        els.getLocation.disabled = false;
        els.getLocation.textContent = '再取得';
      },
      (error) => {
        els.getLocation.disabled = false;
        els.getLocation.textContent = '現在地を取得';
        const msg = error.code === 1
          ? '位置情報の利用が許可されていません。Safariの設定を確認するか、出発地を手入力してください。'
          : '現在地を取得できませんでした。出発地を手入力しても計算できます。';
        showError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  }


  async function startAutoMonitor() {
    showError('');
    if (autoMonitor.active) return;
    if (els.useDebugNow.checked) {
      showError('自動監視では実時間を使います。デバッグ用の仮想時刻をOFFにしてください。');
      return;
    }
    if (!getApiKey()) {
      showError('先にGoogle Maps APIキーを設定してください。');
      return;
    }
    if (!getNavitimeApiKey()) {
      showError('先にNAVITIMEの X-RapidAPI-Key を設定してください。');
      return;
    }
    if (!els.destination.value.trim()) {
      showError('目的地を入力してください。');
      return;
    }
    if (!navigator.geolocation) {
      showError('このブラウザは位置情報の継続取得に対応していません。');
      return;
    }

    autoMonitor.active = true;
    autoMonitor.lastCalcAt = 0;
    autoMonitor.lastCalcPosition = null;
    lastDecisionSnapshot = null;
    updateAutoUi('現在地を取得中…');
    await requestWakeLock();

    autoMonitor.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        els.locationText.textContent = `緯度 ${currentPosition.lat.toFixed(5)}, 経度 ${currentPosition.lng.toFixed(5)}（精度 約${Math.round(currentPosition.accuracy)}m）`;
        updateAutoUi();
        await maybeAutoRecalculate('gps');
      },
      (error) => {
        const msg = error.code === 1
          ? '位置情報の利用が許可されていません。自動監視を停止しました。'
          : '現在地を継続取得できません。自動監視を停止しました。';
        showError(msg);
        stopAutoMonitor();
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 },
    );

    autoMonitor.timerId = window.setInterval(() => {
      maybeAutoRecalculate('timer');
      updateAutoUi();
    }, 10_000);
  }

  async function stopAutoMonitor() {
    if (autoMonitor.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(autoMonitor.watchId);
    }
    if (autoMonitor.timerId !== null) window.clearInterval(autoMonitor.timerId);
    autoMonitor.watchId = null;
    autoMonitor.timerId = null;
    autoMonitor.active = false;
    if (autoMonitor.wakeLock) {
      try { await autoMonitor.wakeLock.release(); } catch (_) { /* no-op */ }
      autoMonitor.wakeLock = null;
    }
    updateAutoUi('停止中');
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      autoMonitor.wakeLock = await navigator.wakeLock.request('screen');
      autoMonitor.wakeLock.addEventListener('release', () => {
        autoMonitor.wakeLock = null;
      });
    } catch (_) {
      autoMonitor.wakeLock = null;
    }
  }

  async function handleVisibilityChange() {
    if (autoMonitor.active && document.visibilityState === 'visible' && !autoMonitor.wakeLock) {
      await requestWakeLock();
    }
  }

  async function maybeAutoRecalculate(trigger = 'timer') {
    if (!autoMonitor.active || calculationInFlight || !currentPosition) return;
    const nowMs = Date.now();
    const policy = currentAutoPolicy();
    const elapsed = nowMs - autoMonitor.lastCalcAt;
    const moved = autoMonitor.lastCalcPosition
      ? haversineMeters(autoMonitor.lastCalcPosition, currentPosition)
      : Infinity;

    const dueByTime = autoMonitor.lastCalcAt === 0 || elapsed >= policy.intervalMs;
    const dueByDistance = moved >= policy.distanceM && elapsed >= AUTO_MIN_INTERVAL_MS;
    if (!dueByTime && !dueByDistance) return;

    // Record the attempt before calling external APIs.  A failed/incomplete
    // calculation must not cause the 10-second monitor loop to hammer the APIs.
    autoMonitor.lastCalcAt = nowMs;
    autoMonitor.lastCalcPosition = { lat: currentPosition.lat, lng: currentPosition.lng };
    await calculate({ source: 'auto', suppressScroll: true, trigger });
    updateAutoUi();
  }

  function currentAutoPolicy() {
    let remaining = Infinity;
    if (lastDecisionSnapshot?.mode === 'candidate') {
      const switchRemaining = lastDecisionSnapshot.candidate?.switchDeadline
        ? lastDecisionSnapshot.candidate.switchDeadline.getTime() - Date.now()
        : Infinity;
      const navRemaining = lastDecisionSnapshot.candidate?.navGuidance?.changeBy instanceof Date
        ? lastDecisionSnapshot.candidate.navGuidance.changeBy.getTime() - Date.now()
        : Infinity;
      remaining = Math.min(switchRemaining, navRemaining);
    } else if (lastDecisionSnapshot?.mode === 'no_toll' && Number.isFinite(lastDecisionSnapshot.localSlackMs)) {
      remaining = lastDecisionSnapshot.localSlackMs;
    }

    if (remaining <= AUTO_CRITICAL_THRESHOLD_MS) {
      return { level: 'critical', intervalMs: AUTO_CRITICAL_INTERVAL_MS, distanceM: AUTO_CRITICAL_DISTANCE_M };
    }
    if (remaining <= AUTO_APPROACH_THRESHOLD_MS) {
      return { level: 'approach', intervalMs: AUTO_APPROACH_INTERVAL_MS, distanceM: AUTO_APPROACH_DISTANCE_M };
    }
    return { level: 'normal', intervalMs: AUTO_NORMAL_INTERVAL_MS, distanceM: AUTO_NORMAL_DISTANCE_M };
  }

  function updateAutoUi(message = '') {
    if (!els.autoStart) return;
    els.autoStart.disabled = autoMonitor.active;
    els.autoStop.disabled = !autoMonitor.active;
    if (!autoMonitor.active) {
      els.autoStatus.textContent = message || '停止中';
      els.monitorDetail.textContent = '開始するとGPSを継続取得します。通常は5分または5km、判断時刻が近づくと3分、直前だけ1分を目安に再計算します。';
      return;
    }

    const policy = currentAutoPolicy();
    const elapsed = autoMonitor.lastCalcAt ? Date.now() - autoMonitor.lastCalcAt : 0;
    const remainMs = Math.max(0, policy.intervalMs - elapsed);
    const mode = policy.level === 'critical' ? '切替直前' : policy.level === 'approach' ? '切替接近' : '通常';
    els.autoStatus.textContent = message || `監視中・${mode}`;
    els.monitorDetail.textContent = autoMonitor.lastCalcAt
      ? `次の時間再計算まで約${Math.max(0, Math.ceil(remainMs / 60_000))}分。推奨候補の変更や、ナビ変更の目安が近づいたときに音声通知します。`
      : '最初のGPS取得後に自動計算します。';
  }

  function finalizeCalculationSnapshot(snapshot, source) {
    if (!snapshot) return;
    if (source === 'auto') maybeNotifyDecisionChange(lastDecisionSnapshot, snapshot);
    if (snapshot.mode === 'candidate' && snapshot.candidate?.waypoint) {
      retainedCandidate = snapshot.candidate;
      retainedCandidateDestination = els.destination.value.trim();
    }
    lastDecisionSnapshot = snapshot;
  }

  function maybeNotifyDecisionChange(previous, next) {
    if (!els.voiceEnabled?.checked || !next || next.mode === 'error' || next.mode === 'incomplete') return;

    if (!previous) {
      if (next.mode === 'no_toll') {
        speakJapanese('現在は高速に乗らなくても、到着条件を満たせます。そのまま走って大丈夫です。');
      } else if (next.mode === 'impossible') {
        speakJapanese('現在の交通状況では、Google推奨ルートでも到着期限を超える見込みです。');
      } else if (next.mode === 'candidate' && next.candidate) {
        speakJapanese(buildCandidateVoiceMessage(next.candidate, 'initial'));
      }
      return;
    }

    const keyChanged = previous.key !== next.key;
    const previousLevel = previous.candidate?.navGuidance?.level || null;
    const nextLevel = next.candidate?.navGuidance?.level || null;
    const navLevelChanged = !keyChanged && previousLevel !== nextLevel;
    if (!keyChanged && !navLevelChanged) return;

    if (next.mode === 'no_toll') {
      speakJapanese('判断が変わりました。いまは高速に乗らなくても、到着条件を満たせます。そのまま走って大丈夫です。');
      return;
    }
    if (next.mode === 'impossible') {
      speakJapanese('到着条件が厳しくなりました。Google推奨ルートでも、期限を超える見込みです。');
      return;
    }
    if (next.mode === 'candidate' && next.candidate) {
      if (keyChanged) {
        speakJapanese(buildCandidateVoiceMessage(next.candidate, previous.mode === 'no_toll' ? 'required' : 'changed'));
      } else if (navLevelChanged) {
        speakJapanese(buildNavUrgencyVoiceMessage(next.candidate));
      }
    }
  }

  function buildCandidateVoiceMessage(candidate, context = 'changed') {
    const toll = Number.isFinite(candidate.toll?.yen) ? `${Math.round(candidate.toll.yen)}円` : '料金は確認中です';
    const eta = candidate.destinationEta instanceof Date ? formatTimeForSpeech(candidate.destinationEta) : '';
    const prefix = context === 'initial'
      ? `現在のおすすめは、${candidate.name}です。`
      : context === 'required'
        ? `高速への切り替えが必要です。おすすめは、${candidate.name}です。`
        : `おすすめの入口が、${candidate.name}に変わりました。`;
    const action = buildNavActionVoice(candidate);
    const etaText = eta ? `目的地には、${eta}ごろ到着する見込みです。` : '';
    return `${prefix}ETC料金は${toll}。${action}${etaText}`;
  }

  function buildNavActionVoice(candidate) {
    const guidance = candidate.navGuidance;
    const switchTime = candidate.switchDeadline instanceof Date ? formatTimeForSpeech(candidate.switchDeadline) : '';
    if (!guidance || !(guidance.changeBy instanceof Date)) {
      return switchTime
        ? `安全のため、早めにカーナビを${candidate.name}へ変更してください。${candidate.name}には、${switchTime}ごろまでに入る必要があります。`
        : `安全のため、早めにカーナビを${candidate.name}へ変更してください。`;
    }
    const remainingMs = guidance.changeBy.getTime() - Date.now();
    const remainingMin = Math.max(0, Math.round(remainingMs / 60_000));
    const changeTime = formatTimeForSpeech(guidance.changeBy);
    if (guidance.level === 'now') {
      return switchTime
        ? `今すぐカーナビを${candidate.name}に変更してください。${candidate.name}には、${switchTime}ごろまでに入る必要があります。`
        : `今すぐカーナビを${candidate.name}に変更してください。`;
    }
    if (guidance.level === 'prepare') {
      return `まだ現在のルートを走れますが、ナビ変更の目安まであと約${remainingMin}分です。${changeTime}ごろまでに、${candidate.name}へ向かう設定に変更してください。`;
    }
    return `今はそのまま走って大丈夫です。カーナビを${candidate.name}に変更する目安は、あと約${remainingMin}分、${changeTime}ごろです。`;
  }

  function buildNavUrgencyVoiceMessage(candidate) {
    const guidance = candidate.navGuidance;
    if (!guidance) return '';
    if (guidance.level === 'now') {
      return `今すぐカーナビを${candidate.name}に変更してください。${candidate.name}へ向かってください。`;
    }
    if (guidance.level === 'prepare') {
      const remainingMs = guidance.changeBy instanceof Date ? guidance.changeBy.getTime() - Date.now() : 0;
      const remainingMin = Math.max(0, Math.round(remainingMs / 60_000));
      return `${candidate.name}へ向かう準備をしてください。ナビ変更の目安まで、あと約${remainingMin}分です。`;
    }
    return '';
  }

  function setupSpeechVoices() {
    if (!('speechSynthesis' in window) || !els.voiceSelect) {
      if (els.voiceStatus) els.voiceStatus.textContent = 'このブラウザでは音声読み上げを利用できません。';
      return;
    }
    const refresh = () => populateSpeechVoiceOptions();
    refresh();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
      window.speechSynthesis.onvoiceschanged = refresh;
    }
    setTimeout(refresh, 500);
    setTimeout(refresh, 1500);
  }

  function populateSpeechVoiceOptions() {
    if (!els.voiceSelect || !('speechSynthesis' in window)) return;
    const voices = (window.speechSynthesis.getVoices?.() || [])
      .filter((voice) => /^ja(-|_)/i.test(voice.lang));
    const current = els.voiceSelect.dataset.savedChoice || els.voiceSelect.value || 'auto-female';
    els.voiceSelect.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = 'auto-female';
    auto.textContent = '女性音声を自動選択';
    els.voiceSelect.appendChild(auto);
    for (const voice of voices) {
      const option = document.createElement('option');
      option.value = voice.voiceURI || voice.name;
      option.textContent = `${voice.name}（${voice.lang}）`;
      els.voiceSelect.appendChild(option);
    }
    const valid = [...els.voiceSelect.options].some((opt) => opt.value === current);
    els.voiceSelect.value = valid ? current : 'auto-female';
    delete els.voiceSelect.dataset.savedChoice;
    const selected = chooseJapaneseVoice();
    if (els.voiceStatus) {
      els.voiceStatus.textContent = selected
        ? `使用予定：${selected.name}。端末側の高品質音声が利用できる場合はそちらを優先します。`
        : '日本語音声を取得できませんでした。端末の音声設定を確認してください。';
    }
  }

  function chooseJapaneseVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = (window.speechSynthesis.getVoices?.() || [])
      .filter((voice) => /^ja(-|_)/i.test(voice.lang));
    if (!voices.length) return null;
    const selectedValue = els.voiceSelect?.value || 'auto-female';
    if (selectedValue !== 'auto-female') {
      const selected = voices.find((voice) => (voice.voiceURI || voice.name) === selectedValue);
      if (selected) return selected;
    }
    const preferredFemaleNames = ['Kyoko', 'Nanami', 'Sakura', 'Hina', 'Ayumi', 'Nozomi'];
    const maleNames = ['Otoya', 'Hattori'];
    return [...voices].sort((a, b) => {
      const score = (voice) => {
        let value = 0;
        if (preferredFemaleNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase()))) value += 100;
        if (maleNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase()))) value -= 100;
        if (voice.localService) value += 10;
        if (/premium|enhanced|siri/i.test(`${voice.name} ${voice.voiceURI}`)) value += 30;
        if (/compact/i.test(voice.voiceURI || '')) value -= 4;
        return value;
      };
      return score(b) - score(a);
    })[0];
  }

  function speakJapanese(text) {
    if (!text || !('speechSynthesis' in window)) {
      showError('このブラウザでは音声読み上げを利用できません。');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.90;
      utterance.pitch = 1.03;
      utterance.volume = 1.0;
      const voice = chooseJapaneseVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('speechSynthesis failed:', error);
    }
  }

  function formatTimeForSpeech(date) {
    return new Intl.DateTimeFormat('ja-JP', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function haversineMeters(a, b) {
    if (!a || !b) return Infinity;
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6_371_000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  async function calculate(options = {}) {
    const source = options.source || 'manual';
    const suppressScroll = Boolean(options.suppressScroll || source === 'auto');
    if (calculationInFlight) return null;
    calculationInFlight = true;

    showError('');
    persistFormState();
    resetCandidateUi();

    const apiKey = getApiKey();
    const navitimeApiKey = getNavitimeApiKey();
    const destination = els.destination.value.trim();
    const deadline = new Date(els.arrivalDeadline.value);
    const safetyMarginMin = clampNumber(Number(els.safetyMargin.value), 0, 120, 10);
    const origin = getOrigin();
    let reference;
    try { reference = getReferenceNow(); } catch (error) {
      calculationInFlight = false;
      showError(error.message);
      return null;
    }
    const now = reference.date;

    if (!apiKey) { calculationInFlight = false; showError('先にGoogle Maps APIキーを設定してください。'); return null; }
    if (!origin) { calculationInFlight = false; showError('「現在地を取得」するか、出発地を手入力してください。'); return null; }
    if (!destination) { calculationInFlight = false; showError('目的地を入力してください。'); return null; }
    if (Number.isNaN(deadline.getTime())) { calculationInFlight = false; showError('到着希望日時を入力してください。'); return null; }
    if (deadline <= now) { calculationInFlight = false; showError('到着希望日時は、計算に使う現在時刻より後に設定してください。'); return null; }

    setBusy(true);
    let snapshot = null;

    try {
      const { Route, RouteMatrix } = await loadGoogleRoutes(apiKey);
      const baseRequest = {
        origin,
        destination,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        language: 'ja',
      };

      const normalRequest = applyFutureDepartureTime({
        ...baseRequest,
        fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'travelAdvisory', 'legs', 'path'],
        extraComputations: ['TOLLS'],
        routeModifiers: {
          vehicleInfo: { emissionType: 'GASOLINE' },
          tollPasses: ['JP_ETC'],
        },
      }, now);

      const localRequest = applyFutureDepartureTime({
        ...baseRequest,
        fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'travelAdvisory', 'legs', 'path'],
        routeModifiers: {
          avoidHighways: true,
          avoidTolls: true,
          avoidFerries: true,
        },
      }, now);

      const [normalResult, localResult] = await Promise.all([
        Route.computeRoutes(normalRequest),
        Route.computeRoutes(localRequest),
      ]);

      const normalRoute = normalResult.routes?.[0];
      const localRoute = localResult.routes?.[0];
      if (!normalRoute || !localRoute) throw new Error('利用可能な経路が見つかりませんでした。');

      const practicalDeadline = new Date(deadline.getTime() - safetyMarginMin * 60_000);
      renderResults({ normalRoute, localRoute, deadline, safetyMarginMin, now, reference, scroll: !suppressScroll });

      const localDirectDurationMs = Number(localRoute.durationMillis || 0);
      const normalDirectDurationMs = Number(normalRoute.durationMillis || 0);
      const localEta = new Date(now.getTime() + localDirectDurationMs);
      const normalEta = new Date(now.getTime() + normalDirectDurationMs);
      const localSlackMs = practicalDeadline.getTime() - localEta.getTime();

      if (localEta <= practicalDeadline) {
        renderNoTollNeeded(localEta, practicalDeadline, now);
        els.tollPrice.textContent = '最適追加料金 0円（高速不要）';
        snapshot = {
          mode: 'no_toll',
          key: 'NO_TOLL',
          now,
          practicalDeadline,
          localEta,
          localSlackMs,
          candidate: null,
        };
        finalizeCalculationSnapshot(snapshot, source);
        return snapshot;
      }

      if (normalEta > practicalDeadline) {
        els.candidateCount.textContent = '期限困難';
        els.candidateStatus.textContent = 'Google推奨ルートでも安全マージン込みの到着期限を超える見込みです。高速入口を変えても同じ経路エンジン上では期限達成を保証できないため、料金探索を省略しました。';
        els.switchSummary.classList.add('hidden');
        snapshot = {
          mode: 'impossible',
          key: 'IMPOSSIBLE',
          now,
          practicalDeadline,
          localEta,
          localSlackMs,
          candidate: null,
        };
        finalizeCalculationSnapshot(snapshot, source);
        return snapshot;
      }

      if (!navitimeApiKey) {
        els.tollPrice.textContent = 'ETC料金：NAVITIMEキー未設定';
        els.candidateStatus.textContent = '下道では到着条件を満たさないため高速候補の料金比較が必要です。NAVITIMEの X-RapidAPI-Key を設定してください。';
        snapshot = { mode: 'incomplete', key: 'NAVITIME_KEY_REQUIRED', now, practicalDeadline, localEta, localSlackMs, candidate: null };
        finalizeCalculationSnapshot(snapshot, source);
        return snapshot;
      }

      const normalFarePromise = updateNormalNavitimeFare(normalRoute, now, navitimeApiKey)
        .catch((fareError) => {
          console.warn('Normal NAVITIME fare failed:', fareError);
          els.tollPrice.textContent = `ETC料金取得失敗：${shortError(fareError)}`;
        });

      let candidateResult = null;
      try {
        [, candidateResult] = await Promise.all([
          normalFarePromise,
          evaluateCandidates({
            Route,
            RouteMatrix,
            origin,
            destination,
            now,
            practicalDeadline,
            localRoute,
            normalRoute,
            localDirectDurationMs,
            normalDirectDurationMs,
            navitimeApiKey,
          }),
        ]);
      } catch (candidateError) {
        console.error('Candidate evaluation failed:', candidateError);
        els.candidateStatus.textContent = `候補評価のみ失敗しました：${String(candidateError?.message || candidateError)}`;
        showError('高速切替候補の計算に失敗しました。通信状況を確認して、再計算してください。');
        snapshot = { mode: 'error', key: 'CANDIDATE_ERROR', now, practicalDeadline, localEta, localSlackMs, candidate: null };
        finalizeCalculationSnapshot(snapshot, source);
        return snapshot;
      }

      let selected = candidateResult?.selected || null;
      if (selected) {
        const selectedKey = `IC:${selected.navitimeIcId || selected.id || selected.name}`;
        const previousGuidance = lastDecisionSnapshot?.key === selectedKey
          ? lastDecisionSnapshot.candidate?.navGuidance
          : null;
        const previousAgeMs = previousGuidance?.computedAt instanceof Date
          ? now.getTime() - previousGuidance.computedAt.getTime()
          : Infinity;
        const previousRemainingMs = previousGuidance?.changeBy instanceof Date
          ? previousGuidance.changeBy.getTime() - now.getTime()
          : Infinity;
        const shouldRecomputeGuidance = source !== 'auto'
          || !previousGuidance
          || (previousRemainingMs <= AUTO_APPROACH_THRESHOLD_MS && previousAgeMs >= NAV_GUIDANCE_RECALC_MS);
        try {
          if (shouldRecomputeGuidance) {
            selected = await enrichNavigationGuidance({
              Route,
              RouteMatrix,
              origin,
              candidate: selected,
              now,
              localRoute,
            });
          } else {
            selected = { ...selected, navGuidance: refreshNavGuidance(previousGuidance, now) };
          }
        } catch (guidanceError) {
          console.warn('Navigation guidance estimation failed:', guidanceError);
          selected = { ...selected, navGuidance: fallbackNavGuidance(selected, now) };
        }
        renderSwitchSummary(selected, now, practicalDeadline);
        snapshot = {
          mode: 'candidate',
          key: selectedKey,
          now,
          practicalDeadline,
          localEta,
          localSlackMs,
          candidate: selected,
        };
      } else {
        snapshot = {
          mode: 'incomplete',
          key: 'NO_SELECTED_CANDIDATE',
          now,
          practicalDeadline,
          localEta,
          localSlackMs,
          candidate: null,
        };
      }
      finalizeCalculationSnapshot(snapshot, source);
      return snapshot;
    } catch (error) {
      console.error(error);
      showError(normalizeApiError(error));
      snapshot = { mode: 'error', key: 'CALCULATION_ERROR', now, candidate: null };
      finalizeCalculationSnapshot(snapshot, source);
      return snapshot;
    } finally {
      setBusy(false);
      calculationInFlight = false;
      if (autoMonitor.active) updateAutoUi();
    }
  }

  async function evaluateCandidates({
    Route,
    RouteMatrix,
    origin,
    destination,
    now,
    practicalDeadline,
    localRoute,
    normalRoute,
    localDirectDurationMs,
    normalDirectDurationMs,
    navitimeApiKey,
  }) {
    const startedAt = performance.now();
    const routePath = normalizeRoutePath(localRoute?.path);
    if (routePath.length < 2) {
      throw new Error('下道ルートの形状を取得できないため、高速切替地点を探索できませんでした。');
    }

    const cumulative = cumulativePathDistances(routePath);
    const routeTotalMeters = cumulative.at(-1) || Number(localRoute.distanceMeters || 0);
    if (!routeTotalMeters) throw new Error('下道ルートの距離を取得できませんでした。');

    // v0.6.3: locate the deadline boundary with *time-correct* synthetic
    // checkpoints first.  Each checkpoint uses the predicted arrival time at
    // that checkpoint as the departureTime of the fast leg.  This fixes the
    // main v0.4.5 error where the second leg was approximated at "now".
    const checkpointResult = await evaluateSyntheticCheckpointBoundary({
      Route,
      RouteMatrix,
      origin,
      destination,
      now,
      practicalDeadline,
      routePath,
      cumulative,
      localDirectDurationMs,
      normalDirectDurationMs,
    });

    const boundary = checkpointResult.boundary;
    if (!boundary?.safe || !boundary?.unsafe) {
      throw new Error('高速切替の期限境界を特定できませんでした。');
    }

    const window = chooseExactNavitimeIcSearchWindow(boundary, routeTotalMeters);
    els.candidateCount.textContent = `境界${checkpointResult.evaluated.length}点`;
    els.candidateStatus.textContent = `${boundary.safe.name}〜${boundary.unsafe.name}の間に期限境界を確認。周辺の実在ICをNAVITIMEから取得中…`;

    const discovered = await discoverInterchangesViaNavitime({
      apiKey: navitimeApiKey,
      routePath,
      cumulative,
      window,
      boundaryProgress: boundary.progress,
    });

    if (!discovered.length) {
      return recoverCandidatesViaRecommendedRoute({
        Route, RouteMatrix, origin, destination, now, practicalDeadline, localDirectDurationMs,
        normalRoute, navitimeApiKey, startedAt, reason: 'no_interchanges',
      });
    }

    // Only ICs reasonably close to the local-road corridor are useful.  NAVITIME
    // /ic returns nearby interchanges around sampled route points, but the same
    // IC can be returned many times; project + dedupe before any Google calls.
    let projected = discovered
      .map((candidate) => ({ ...candidate, ...projectPointToRoute(candidate.waypoint, routePath) }))
      .filter((candidate) => Number.isFinite(candidate.routeProgressMeters)
        && Number.isFinite(candidate.corridorDistanceMeters)
        && candidate.corridorDistanceMeters <= 15_000
        && candidate.routeProgressMeters >= window.start - 20_000
        && candidate.routeProgressMeters <= window.end + 20_000);
    projected = dedupeCandidates(projected)
      .sort((a, b) => (a.routeProgressMeters - b.routeProgressMeters)
        || (a.corridorDistanceMeters - b.corridorDistanceMeters));

    if (!projected.length) {
      return recoverCandidatesViaRecommendedRoute({
        Route, RouteMatrix, origin, destination, now, practicalDeadline, localDirectDurationMs,
        normalRoute, navitimeApiKey, startedAt, reason: 'no_projected_interchanges',
      });
    }

    els.candidateCount.textContent = `境界${checkpointResult.evaluated.length}点 / IC${projected.length}件`;
    els.candidateStatus.textContent = `実在IC ${projected.length}件を取得。まず現在地→各ICの下道所要時間を一括計算中…`;

    const localCandidates = (await attachLocalMatrixChunked(RouteMatrix, origin, projected, now))
      .filter((candidate) => candidate.exists)
      .sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);

    if (!localCandidates.length) {
      return recoverCandidatesViaRecommendedRoute({
        Route, RouteMatrix, origin, destination, now, practicalDeadline, localDirectDurationMs,
        normalRoute, navitimeApiKey, startedAt, reason: 'no_local_candidates',
      });
    }

    // Actual ICs are then searched adaptively.  A handful of exact anchor ICs
    // cover the whole candidate range, followed by binary search between the
    // furthest safe anchor and the next unsafe anchor.  Every exact test uses
    // the real predicted IC arrival time for its fast leg.
    const actualBoundary = await adaptiveBoundarySearchV046({
      Route,
      candidates: localCandidates,
      destination,
      now,
      practicalDeadline,
      localDirectDurationMs,
    });

    if (!actualBoundary.boundary) {
      return recoverCandidatesViaRecommendedRoute({
        Route, RouteMatrix, origin, destination, now, practicalDeadline, localDirectDurationMs,
        normalRoute, navitimeApiKey, startedAt, reason: 'no_safe_candidate',
      });
    }

    const ordered = localCandidates;
    const boundaryIndex = ordered.findIndex((item) => item.id === actualBoundary.boundary.id);
    const existingById = new Map(actualBoundary.evaluated.filter(Boolean).map((item) => [item.id, item]));

    // The important candidates for the user's objective are the latest safe
    // entries immediately before the deadline boundary.  Always evaluate these
    // explicitly; this guarantees that a 13:45 arrival cannot win merely because
    // the 14:45-ish entries were never inspected.
    const nearStart = Math.max(0, boundaryIndex - (BOUNDARY_PRICE_NEIGHBORS - 1));
    const nearEnd = Math.min(ordered.length, boundaryIndex + 3);
    const nearBoundary = ordered.slice(nearStart, nearEnd);

    // Add two earlier price sentinels to catch obvious non-monotonic toll
    // structures without pricing every single IC on every refresh.
    const earlier = ordered.slice(0, Math.max(0, nearStart));
    const sentinels = selectProgressRepresentatives(earlier, PRICE_SENTINEL_LIMIT_V046, 1);
    const exactNeeded = dedupeCandidates([...nearBoundary, ...sentinels]);

    const missingExact = exactNeeded.filter((candidate) => !existingById.has(candidate.id));
    const newlyExact = await mapWithConcurrency(missingExact, CANDIDATE_CONCURRENCY, (candidate) => (
      evaluateCandidateTiming({
        Route,
        candidate,
        destination,
        now,
        practicalDeadline,
        localDirectDurationMs,
      })
    ));
    for (const item of newlyExact) existingById.set(item.id, item);

    const exactDisplay = [...existingById.values()]
      .filter((item) => item && !item.failed && item.fastDurationMs > 0);
    const fareCandidates = exactNeeded
      .map((candidate) => existingById.get(candidate.id))
      .filter((item) => item && !item.failed && item.safe)
      .sort((a, b) => b.routeProgressMeters - a.routeProgressMeters);

    if (!fareCandidates.length) {
      return recoverCandidatesViaRecommendedRoute({
        Route, RouteMatrix, origin, destination, now, practicalDeadline, localDirectDurationMs,
        normalRoute, navitimeApiKey, startedAt, reason: 'no_fare_candidate',
      });
    }

    els.candidateCount.textContent = `境界${checkpointResult.evaluated.length}点 / IC${projected.length}件 / 正確${exactDisplay.length}件 / 料金${fareCandidates.length}件`;
    els.candidateStatus.textContent = `期限直前の${Math.min(BOUNDARY_PRICE_NEIGHBORS, fareCandidates.length)}候補を必ず含め、普通車ETC料金を比較中…`;

    const pricedResults = await mapWithConcurrency(fareCandidates, NAVITIME_CONCURRENCY, async (candidate) => {
      if (!candidate.endpoints?.goal) {
        return { ...candidate, navitimeFareError: 'Google経路から目的地座標を取得できませんでした。' };
      }
      try {
        const navFare = await fetchNavitimeEtcFare({
          apiKey: navitimeApiKey,
          start: candidate.endpoints?.start || candidate.waypoint,
          startIcId: candidate.navitimeIcId || null,
          goal: candidate.endpoints.goal,
          departureTime: candidate.icArrival,
          startName: candidate.name,
          forceTollStart: !candidate.navitimeIcId,
        });
        return { ...candidate, toll: navFare, navitimeFareError: null };
      } catch (error) {
        console.warn('NAVITIME fare failed:', candidate.name, error);
        return { ...candidate, navitimeFareError: shortError(error) };
      }
    });

    const byId = new Map(exactDisplay.map((item) => [item.id, item]));
    for (const priced of pricedResults) byId.set(priced.id, priced);
    const allDisplay = [...byId.values()];
    const pricedSafe = allDisplay.filter((item) => item.safe
      && Number.isFinite(item.toll?.yen)
      && item.toll?.source === 'NAVITIME');

    let selected = pricedSafe
      .slice()
      .sort((a, b) => (a.toll.yen - b.toll.yen)
        || ((practicalDeadline.getTime() - a.destinationEta.getTime()) - (practicalDeadline.getTime() - b.destinationEta.getTime()))
        || (b.routeProgressMeters - a.routeProgressMeters))[0] || null;

    if (!selected) {
      selected = allDisplay.filter((item) => item.safe)
        .slice()
        .sort((a, b) => b.routeProgressMeters - a.routeProgressMeters)[0] || null;
    }

    if (selected) {
      selected = await refineSwitchDeadline(Route, selected, destination, practicalDeadline, now);
      byId.set(selected.id, selected);
    }

    const display = [...byId.values()].sort((a, b) => {
      const aPriced = Number.isFinite(a.toll?.yen) && a.toll?.source === 'NAVITIME';
      const bPriced = Number.isFinite(b.toll?.yen) && b.toll?.source === 'NAVITIME';
      if (aPriced && bPriced) return (a.toll.yen - b.toll.yen) || (b.routeProgressMeters - a.routeProgressMeters);
      if (aPriced !== bPriced) return aPriced ? -1 : 1;
      if (a.safe !== b.safe) return a.safe ? -1 : 1;
      return b.routeProgressMeters - a.routeProgressMeters;
    });

    renderCandidateList(display, selected?.id || null, now, practicalDeadline);
    renderSwitchSummary(selected, now, practicalDeadline);

    const elapsedSec = (performance.now() - startedAt) / 1000;
    if (selected && Number.isFinite(selected.toll?.yen) && selected.toll?.source === 'NAVITIME') {
      const entrySlackMs = selected.switchDeadline.getTime() - selected.icArrival.getTime();
      const arrivalSlackMs = practicalDeadline.getTime() - selected.destinationEta.getTime();
      els.candidateStatus.textContent = `実時間補正した境界探索→実在ICの粗密探索を実施。期限直前候補を含む${pricedSafe.length}件を料金比較し、最安は${selected.name}の${selected.toll.text}。実質到着期限までの余裕は${formatSignedDuration(arrivalSlackMs)}、IC到着余裕は${formatSignedDuration(entrySlackMs)}。探索 ${elapsedSec.toFixed(1)}秒。`;
    } else if (selected) {
      els.candidateStatus.textContent = `期限境界は特定できましたが、料金取得に失敗したため時間ベースの暫定候補です。探索 ${elapsedSec.toFixed(1)}秒。`;
    } else {
      els.candidateStatus.textContent = `期限境界周辺を探索しましたが、条件を満たす候補を確定できませんでした。探索 ${elapsedSec.toFixed(1)}秒。`;
    }

    return { selected, display, pricedSafe, elapsedSec };
  }

  async function recoverCandidatesViaRecommendedRoute({
    Route,
    RouteMatrix,
    origin,
    destination,
    now,
    practicalDeadline,
    localDirectDurationMs,
    normalRoute,
    navitimeApiKey,
    startedAt,
    reason,
  }) {
    // The local-road corridor can miss a perfectly usable entrance when the
    // fastest route first moves sideways (or slightly backwards) to reach an
    // expressway.  When that happens, use Google's known-safe recommended route
    // as a second discovery axis instead of concluding that no safe IC exists.
    const normalPath = normalizeRoutePath(normalRoute?.path);
    const remembered = retainedCandidateDestination === destination && retainedCandidate?.waypoint
      ? [{
        id: retainedCandidate.id || `remembered-${retainedCandidate.navitimeIcId || retainedCandidate.name}`,
        navitimeIcId: retainedCandidate.navitimeIcId || null,
        name: retainedCandidate.name,
        road: retainedCandidate.road || '前回の推奨入口',
        waypoint: retainedCandidate.waypoint,
        source: 'RETAINED',
      }]
      : [];

    if (normalPath.length < 2 && !remembered.length) {
      renderCandidateList([], null, now, practicalDeadline);
      els.candidateStatus.textContent = 'Google推奨ルートなら期限内ですが、高速入口を特定できませんでした。';
      return { selected: null, reason: `recovery_unavailable:${reason}` };
    }

    const discovered = [];
    if (normalPath.length >= 2) {
      const cumulative = cumulativePathDistances(normalPath);
      const total = cumulative.at(-1) || 0;
      const horizon = Math.min(total, RECOVERY_ROUTE_HORIZON_M);
      const progresses = [];
      for (let p = 0; p <= horizon + 1; p += RECOVERY_IC_SAMPLE_STEP_M) progresses.push(p);
      if (!progresses.length || Math.abs(progresses.at(-1) - horizon) > 3_000) progresses.push(horizon);
      const centers = progresses
        .map((progress) => interpolatePathAtDistance(normalPath, cumulative, progress))
        .filter(Boolean);
      const groups = await mapWithConcurrency(centers, NAVITIME_IC_SEARCH_CONCURRENCY, (coord) => (
        fetchNavitimeIcSearch({ apiKey: navitimeApiKey, coord, radiusMeters: NAVITIME_IC_SEARCH_RADIUS_M })
      ));
      groups.forEach((group) => discovered.push(...group));
    }

    let pool = dedupeCandidates([...remembered, ...discovered]);
    if (!pool.length) {
      renderCandidateList([], null, now, practicalDeadline);
      els.candidateStatus.textContent = 'Google推奨ルートなら期限内ですが、高速入口を取得できませんでした。';
      return { selected: null, reason: `recovery_no_ic:${reason}` };
    }

    // Project to the recommended route only for representative selection.  The
    // final feasibility check always uses an actual local-road route to the IC.
    if (normalPath.length >= 2) {
      pool = pool.map((candidate) => ({ ...candidate, ...projectPointToRoute(candidate.waypoint, normalPath) }));
    }
    const withLocal = (await attachLocalMatrixChunked(RouteMatrix, origin, pool, now))
      .filter((candidate) => candidate.exists && Number.isFinite(candidate.localDurationMs));
    if (!withLocal.length) {
      renderCandidateList([], null, now, practicalDeadline);
      els.candidateStatus.textContent = 'Google推奨ルートなら期限内ですが、入口までの下道経路を取得できませんでした。';
      return { selected: null, reason: `recovery_no_local:${reason}` };
    }

    const rememberedIds = new Set(remembered.map((x) => x.id));
    const ordered = withLocal.slice().sort((a, b) => a.localDurationMs - b.localDurationMs);
    const representatives = [];
    // Always re-check the previous recommendation if it still exists.
    for (const item of ordered) {
      if (rememberedIds.has(item.id)) representatives.push(item);
    }
    // Keep several nearby entries plus evenly-spaced entries farther along the
    // recommended route so a dense urban IC cluster cannot consume the budget.
    representatives.push(...ordered.slice(0, 8));
    representatives.push(...selectProgressRepresentatives(
      ordered.filter((x) => Number.isFinite(x.routeProgressMeters)),
      Math.max(0, RECOVERY_EXACT_LIMIT - 8),
      1,
    ));
    const exactPool = dedupeCandidates(representatives).slice(0, RECOVERY_EXACT_LIMIT);
    const exact = await mapWithConcurrency(exactPool, CANDIDATE_CONCURRENCY, (candidate) => (
      evaluateCandidateTiming({ Route, candidate, destination, now, practicalDeadline, localDirectDurationMs })
    ));
    const safe = exact.filter((item) => item && !item.failed && item.safe);

    if (!safe.length) {
      // Important invariant: the Google recommended route is known to meet the
      // deadline before this function is called.  Showing a list of only unsafe
      // ICs would falsely imply that no feasible route exists, so keep the UI
      // honest and retry on the next scheduled refresh instead.
      renderCandidateList([], null, now, practicalDeadline);
      els.candidateStatus.textContent = 'Google推奨ルートなら期限内です。高速入口の特定だけ再確認が必要です。';
      return { selected: null, reason: `recovery_no_safe:${reason}` };
    }

    const latest = safe.slice().sort((a, b) => b.localDurationMs - a.localDurationMs);
    const farePool = dedupeCandidates([
      ...latest.slice(0, RECOVERY_FARE_LIMIT),
      ...selectProgressRepresentatives(safe, Math.min(2, safe.length), 1),
    ]).slice(0, RECOVERY_FARE_LIMIT + 2);

    const priced = await mapWithConcurrency(farePool, NAVITIME_CONCURRENCY, async (candidate) => {
      if (!candidate.endpoints?.goal) return candidate;
      try {
        const navFare = await fetchNavitimeEtcFare({
          apiKey: navitimeApiKey,
          start: candidate.endpoints?.start || candidate.waypoint,
          startIcId: candidate.navitimeIcId || null,
          goal: candidate.endpoints.goal,
          departureTime: candidate.icArrival,
          startName: candidate.name,
          forceTollStart: !candidate.navitimeIcId,
        });
        return { ...candidate, toll: navFare, navitimeFareError: null };
      } catch (error) {
        console.warn('NAVITIME recovery fare failed:', candidate.name, error);
        return { ...candidate, navitimeFareError: shortError(error) };
      }
    });

    const pricedSafe = priced.filter((item) => item.safe && Number.isFinite(item.toll?.yen) && item.toll?.source === 'NAVITIME');
    let selected = pricedSafe.slice().sort((a, b) => (a.toll.yen - b.toll.yen)
      || (b.localDurationMs - a.localDurationMs))[0] || null;
    if (!selected) selected = latest[0] || null;
    if (selected) selected = await refineSwitchDeadline(Route, selected, destination, practicalDeadline, now);

    const displayMap = new Map(exact.filter((x) => x && !x.failed).map((x) => [x.id, x]));
    priced.forEach((x) => displayMap.set(x.id, x));
    if (selected) displayMap.set(selected.id, selected);
    const display = [...displayMap.values()].sort((a, b) => {
      const ap = Number.isFinite(a.toll?.yen) && a.toll?.source === 'NAVITIME';
      const bp = Number.isFinite(b.toll?.yen) && b.toll?.source === 'NAVITIME';
      if (ap && bp) return (a.toll.yen - b.toll.yen) || (b.localDurationMs - a.localDurationMs);
      if (ap !== bp) return ap ? -1 : 1;
      if (a.safe !== b.safe) return a.safe ? -1 : 1;
      return b.localDurationMs - a.localDurationMs;
    });

    renderCandidateList(display, selected?.id || null, now, practicalDeadline);
    renderSwitchSummary(selected, now, practicalDeadline);
    const elapsedSec = (performance.now() - startedAt) / 1000;
    els.candidateStatus.textContent = selected
      ? `推奨ルート側も含めて入口候補を再確認しました。探索 ${elapsedSec.toFixed(1)}秒。`
      : '高速入口を再確認中です。';
    return { selected, display, pricedSafe, elapsedSec, recovered: true };
  }

  async function evaluateSyntheticCheckpointBoundary({
    Route,
    RouteMatrix,
    origin,
    destination,
    now,
    practicalDeadline,
    routePath,
    cumulative,
    localDirectDurationMs,
    normalDirectDurationMs,
  }) {
    const checkpoints = makeRouteCheckpoints(routePath, cumulative, EXACT_CHECKPOINT_COUNT);
    const first = checkpoints[0];
    const last = checkpoints[checkpoints.length - 1];
    const interior = checkpoints.slice(1, -1);

    els.candidateStatus.textContent = `ルート上${checkpoints.length}点を、各地点に実際に到着する未来時刻で評価中…`;
    const localInterior = await attachLocalMatrix(RouteMatrix, origin, interior, now);
    const exactInterior = await mapWithConcurrency(localInterior.filter((item) => item.exists), CANDIDATE_CONCURRENCY, (candidate) => (
      evaluateCandidateTiming({
        Route,
        candidate,
        destination,
        now,
        practicalDeadline,
        localDirectDurationMs,
      })
    ));

    const firstEta = new Date(now.getTime() + normalDirectDurationMs);
    const firstExact = {
      ...first,
      exists: true,
      localDurationMs: 0,
      localDistanceMeters: 0,
      fastDurationMs: normalDirectDurationMs,
      totalDurationMs: normalDirectDurationMs,
      icArrival: new Date(now),
      destinationEta: firstEta,
      switchDeadline: new Date(practicalDeadline.getTime() - normalDirectDurationMs),
      safe: firstEta <= practicalDeadline,
      failed: false,
      timeSavedMs: Math.max(0, localDirectDurationMs - normalDirectDurationMs),
    };
    const lastEta = new Date(now.getTime() + localDirectDurationMs);
    const lastExact = {
      ...last,
      exists: true,
      localDurationMs: localDirectDurationMs,
      localDistanceMeters: Number(localDirectDurationMs > 0 ? 1 : 0),
      fastDurationMs: 0,
      totalDurationMs: localDirectDurationMs,
      icArrival: lastEta,
      destinationEta: lastEta,
      switchDeadline: practicalDeadline,
      safe: lastEta <= practicalDeadline,
      failed: false,
      timeSavedMs: 0,
    };

    const evaluated = [firstExact, ...exactInterior.filter((x) => x && !x.failed), lastExact]
      .sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    const safe = evaluated.filter((item) => item.safe);
    if (!safe.length) return { boundary: null, evaluated };
    const furthestSafe = safe[safe.length - 1];
    const unsafeAfter = evaluated.find((item) => item.routeProgressMeters > furthestSafe.routeProgressMeters && !item.safe);
    if (!unsafeAfter) return { boundary: null, evaluated };
    return {
      boundary: {
        safe: furthestSafe,
        unsafe: unsafeAfter,
        progress: (furthestSafe.routeProgressMeters + unsafeAfter.routeProgressMeters) / 2,
      },
      evaluated,
    };
  }

  function chooseExactNavitimeIcSearchWindow(boundary, routeTotalMeters) {
    const safeProgress = boundary.safe.routeProgressMeters;
    const unsafeProgress = boundary.unsafe.routeProgressMeters;
    return {
      start: Math.max(0, safeProgress - 70_000),
      end: Math.min(routeTotalMeters, unsafeProgress + 50_000),
    };
  }

  async function attachLocalMatrixChunked(RouteMatrix, origin, candidates, departureTime = null) {
    const chunkSize = 80;
    const chunks = [];
    for (let i = 0; i < candidates.length; i += chunkSize) chunks.push(candidates.slice(i, i + chunkSize));
    const groups = await mapWithConcurrency(chunks, 3, (chunk) => attachLocalMatrix(RouteMatrix, origin, chunk, departureTime));
    return groups.flat();
  }

  function evenlySpacedIndexes(length, limit) {
    if (length <= 0) return [];
    if (length <= limit) return Array.from({ length }, (_, i) => i);
    const result = [];
    for (let i = 0; i < limit; i += 1) {
      result.push(Math.round(i * (length - 1) / (limit - 1)));
    }
    return [...new Set(result)];
  }

  async function adaptiveBoundarySearchV046({
    Route,
    candidates,
    destination,
    now,
    practicalDeadline,
    localDirectDurationMs,
  }) {
    const ordered = candidates.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    const cache = new Map();
    const evaluateIndex = async (index) => {
      if (index < 0 || index >= ordered.length) return null;
      const candidate = ordered[index];
      if (!cache.has(candidate.id)) {
        cache.set(candidate.id, await evaluateCandidateTiming({
          Route,
          candidate,
          destination,
          now,
          practicalDeadline,
          localDirectDurationMs,
        }));
      }
      return cache.get(candidate.id);
    };

    const anchorIndexes = evenlySpacedIndexes(ordered.length, ACTUAL_BOUNDARY_ANCHORS);
    await mapWithConcurrency(anchorIndexes, CANDIDATE_CONCURRENCY, evaluateIndex);
    const anchorResults = anchorIndexes
      .map((index) => ({ index, result: cache.get(ordered[index].id) }))
      .filter((item) => item.result && !item.result.failed);
    const safeAnchors = anchorResults.filter((item) => item.result.safe);
    if (!safeAnchors.length) {
      return { boundary: null, evaluated: [...cache.values()], kind: 'none' };
    }

    let low = safeAnchors[safeAnchors.length - 1].index;
    let highItem = anchorResults.find((item) => item.index > low && !item.result.safe);
    if (!highItem) {
      const last = await evaluateIndex(ordered.length - 1);
      if (last && !last.failed && last.safe) {
        return { boundary: last, evaluated: [...cache.values()], boundaryIndex: ordered.length - 1, kind: 'horizon-edge' };
      }
      highItem = { index: ordered.length - 1, result: last };
    }
    let high = highItem.index;

    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const result = await evaluateIndex(mid);
      if (result && !result.failed && result.safe) low = mid;
      else high = mid;
    }

    // Probe immediate neighbours, including several points beyond the first
    // unsafe entry, to catch small non-monotonic reversals caused by topology or
    // traffic.  If a later safe point appears, move the boundary forward.
    const neighbourIndexes = [];
    for (let i = Math.max(0, low - 2); i <= Math.min(ordered.length - 1, high + 4); i += 1) neighbourIndexes.push(i);
    await mapWithConcurrency([...new Set(neighbourIndexes)], CANDIDATE_CONCURRENCY, evaluateIndex);
    const safeEvaluated = [...cache.values()]
      .filter((item) => item && !item.failed && item.safe)
      .sort((a, b) => b.routeProgressMeters - a.routeProgressMeters);
    const boundary = safeEvaluated[0] || null;
    const boundaryIndex = boundary ? ordered.findIndex((item) => item.id === boundary.id) : -1;
    return {
      boundary,
      evaluated: [...cache.values()],
      boundaryIndex,
      kind: boundary ? 'deadline-boundary' : 'none',
    };
  }

  function makeRouteCheckpoints(routePath, cumulative, count = 9) {
    const total = cumulative.at(-1) || 0;
    const n = Math.max(3, Math.floor(count));
    const checkpoints = [];
    for (let i = 0; i < n; i += 1) {
      const progress = total * (i / (n - 1));
      const waypoint = interpolatePathAtDistance(routePath, cumulative, progress);
      if (!waypoint) continue;
      checkpoints.push({
        id: `checkpoint-${i}`,
        name: `ルート${Math.round(i * 100 / (n - 1))}%`,
        road: '下道ルート上の仮想点',
        waypoint,
        routeProgressMeters: progress,
        corridorDistanceMeters: 0,
        source: 'CHECKPOINT',
      });
    }
    return checkpoints;
  }

  function chooseNavitimeIcSearchWindow(boundary, coarse, routeTotalMeters) {
    const ordered = coarse.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    if (boundary.kind === 'transition' && boundary.safe && boundary.unsafe) {
      return {
        start: Math.max(0, boundary.safe.routeProgressMeters - 55_000),
        end: Math.min(routeTotalMeters, boundary.unsafe.routeProgressMeters + 40_000),
      };
    }
    if (boundary.kind === 'before-first') {
      return { start: 0, end: Math.min(routeTotalMeters, 90_000) };
    }
    const safeProgress = boundary.safe?.routeProgressMeters ?? boundary.progress;
    return { start: Math.max(0, safeProgress - 90_000), end: routeTotalMeters };
  }

  async function discoverInterchangesViaNavitime({ apiKey, routePath, cumulative, window, boundaryProgress }) {
    const progresses = [];
    const addProgress = (value) => {
      const clamped = Math.max(0, Math.min(cumulative.at(-1) || 0, value));
      if (!progresses.some((existing) => Math.abs(existing - clamped) < 4_000)) progresses.push(clamped);
    };

    for (let p = window.start; p <= window.end + 1; p += NAVITIME_IC_SAMPLE_STEP_M) addProgress(p);
    addProgress(window.end);
    addProgress(boundaryProgress);


    progresses.sort((a, b) => a - b);
    const centers = progresses.map((progress) => ({
      progress,
      coord: interpolatePathAtDistance(routePath, cumulative, progress),
    })).filter((item) => item.coord);

    const resultGroups = await mapWithConcurrency(centers, NAVITIME_IC_SEARCH_CONCURRENCY, async ({ coord }) => (
      fetchNavitimeIcSearch({ apiKey, coord, radiusMeters: NAVITIME_IC_SEARCH_RADIUS_M })
    ));

    const byId = new Map();
    for (const group of resultGroups) {
      for (const candidate of group) {
        if (!candidate?.id) continue;
        byId.set(candidate.id, candidate);
      }
    }
    return [...byId.values()];
  }

  async function fetchNavitimeIcSearch({ apiKey, coord, radiusMeters = 10_000 }) {
    const cacheKey = `${coord.lat.toFixed(2)},${coord.lng.toFixed(2)}:${Math.round(radiusMeters)}`;
    if (NAVITIME_IC_CACHE.has(cacheKey)) return NAVITIME_IC_CACHE.get(cacheKey);

    const params = new URLSearchParams();
    params.set('coord', `${coord.lat},${coord.lng}`);
    params.set('radius', String(Math.min(10_000, Math.max(1, Math.round(radiusMeters)))));
    params.set('type', 'entrance');
    params.set('limit', '20');
    params.set('datum', 'wgs84');
    params.set('coord_unit', 'degree');

    let response;
    try {
      response = await fetch(`${NAVITIME_IC_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': NAVITIME_HOST,
        },
      });
    } catch (error) {
      throw new Error(`NAVITIMEのIC検索へ接続できませんでした。${shortError(error)}`);
    }

    const rawText = await response.text();
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; } catch (_) { /* keep text */ }
    if (!response.ok) {
      const detail = data?.message || data?.error || data?.errors || rawText || response.statusText;
      throw new Error(`NAVITIME IC検索 HTTP ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const parsed = items
      .filter((item) => item?.entrance !== false)
      .map((item) => {
        const lat = Number(item?.coord?.lat);
        const lng = Number(item?.coord?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !item?.id) return null;
        const etcOnly = Boolean(item?.etc_only?.entrance);
        return {
          id: `navitime-ic-${item.id}`,
          navitimeIcId: String(item.id),
          name: String(item.name || `IC ${item.id}`),
          road: `${String(item.road_name || '高速道路')}${etcOnly ? ' / ETC専用入口' : ''}`,
          waypoint: { lat, lng },
          source: 'NAVITIME_IC',
          etcOnly,
        };
      })
      .filter(Boolean);

    NAVITIME_IC_CACHE.set(cacheKey, parsed);
    return parsed;
  }

  async function attachLocalMatrix(RouteMatrix, origin, candidates, departureTime = null) {
    if (!candidates.length) return [];
    const request = {
      origins: [{
        waypoint: origin,
        routeModifiers: {
          avoidHighways: true,
          avoidTolls: true,
          avoidFerries: true,
        },
      }],
      destinations: candidates.map((candidate) => candidate.waypoint),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      language: 'ja',
      fields: ['condition', 'durationMillis', 'distanceMeters'],
    };
    applyFutureDepartureTime(request, departureTime);
    const { matrix } = await RouteMatrix.computeRouteMatrix(request);
    const items = matrix?.rows?.[0]?.items || [];
    return candidates.map((candidate, index) => {
      const item = items[index];
      const durationMs = Number(item?.durationMillis || 0);
      const distanceMeters = Number(item?.distanceMeters || 0);
      const condition = String(item?.condition || '');
      const exists = durationMs > 0 && (!condition || condition.includes('ROUTE_EXISTS'));
      return { ...candidate, localDurationMs: durationMs, localDistanceMeters: distanceMeters, exists };
    });
  }

  async function attachFastMatrixApprox(RouteMatrix, candidates, destination, departureTime = null) {
    if (!candidates.length) return [];
    const request = {
      // RouteMatrix origins may be wrapped in RouteMatrixOrigin because they
      // support per-origin route modifiers. Destinations, however, are passed
      // directly as location values (address string, Place, or LatLng literal).
      origins: candidates.map((candidate) => ({ waypoint: candidate.waypoint })),
      destinations: [destination],
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      language: 'ja',
      fields: ['durationMillis', 'distanceMeters'],
    };
    applyFutureDepartureTime(request, departureTime);
    const { matrix } = await RouteMatrix.computeRouteMatrix(request);
    const rows = matrix?.rows || [];
    return candidates.map((candidate, index) => {
      const item = rows[index]?.items?.[0];
      const durationMs = Number(item?.durationMillis || 0);
      const distanceMeters = Number(item?.distanceMeters || 0);
      const condition = String(item?.condition || '');
      const exists = durationMs > 0 && (!condition || condition.includes('ROUTE_EXISTS'));
      return { ...candidate, fastApproxDurationMs: durationMs, fastApproxDistanceMeters: distanceMeters, fastApproxExists: exists };
    });
  }

  function combineApproximateMatrixResults(localResults, fastResults, now, practicalDeadline) {
    const fastById = new Map(fastResults.map((item) => [item.id, item]));
    return localResults.map((local) => {
      const fast = fastById.get(local.id) || {};
      const approxTotalDurationMs = Number(local.localDurationMs || 0) + Number(fast.fastApproxDurationMs || 0);
      const approxEta = new Date(now.getTime() + approxTotalDurationMs);
      return {
        ...local,
        fastApproxDurationMs: Number(fast.fastApproxDurationMs || 0),
        fastApproxDistanceMeters: Number(fast.fastApproxDistanceMeters || 0),
        fastApproxExists: Boolean(fast.fastApproxExists),
        approxTotalDurationMs,
        approxEta,
        approxSafe: Boolean(local.exists && fast.fastApproxExists && approxEta <= practicalDeadline),
      };
    });
  }

  function inferApproximateBoundary(candidates) {
    const ordered = candidates.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    const safe = ordered.filter((item) => item.approxSafe);
    if (!safe.length) {
      const first = ordered[0];
      return { progress: first.routeProgressMeters, label: `${first.name}より手前`, kind: 'before-first' };
    }

    const furthestSafe = safe[safe.length - 1];
    const safeIndex = ordered.findIndex((item) => item.id === furthestSafe.id);
    const laterUnsafe = ordered.slice(safeIndex + 1).find((item) => !item.approxSafe);
    if (laterUnsafe) {
      return {
        progress: (furthestSafe.routeProgressMeters + laterUnsafe.routeProgressMeters) / 2,
        label: `${furthestSafe.name}〜${laterUnsafe.name}付近`,
        kind: 'transition',
        safe: furthestSafe,
        unsafe: laterUnsafe,
      };
    }
    return { progress: furthestSafe.routeProgressMeters, label: `${furthestSafe.name}より先`, kind: 'tail', safe: furthestSafe };
  }

  function chooseDetailWindow(boundary, coarse, routeTotalMeters) {
    const ordered = coarse.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    if (boundary.kind === 'transition' && boundary.safe && boundary.unsafe) {
      const safeIndex = ordered.findIndex((item) => item.id === boundary.safe.id);
      const unsafeIndex = ordered.findIndex((item) => item.id === boundary.unsafe.id);
      const before = ordered[Math.max(0, safeIndex - 1)]?.routeProgressMeters ?? 0;
      const after = ordered[Math.min(ordered.length - 1, unsafeIndex + 1)]?.routeProgressMeters ?? routeTotalMeters;
      return { start: Math.max(0, before), end: Math.min(routeTotalMeters, after) };
    }
    if (boundary.kind === 'before-first') {
      const end = ordered[Math.min(2, ordered.length - 1)]?.routeProgressMeters ?? Math.min(routeTotalMeters, boundary.progress + 60_000);
      return { start: 0, end: Math.min(routeTotalMeters, end) };
    }
    const safeIndex = ordered.findIndex((item) => item.id === boundary.safe?.id);
    const start = ordered[Math.max(0, safeIndex - 1)]?.routeProgressMeters ?? Math.max(0, boundary.progress - 60_000);
    return { start: Math.max(0, start), end: routeTotalMeters };
  }

  async function evaluateCandidateTiming({
    Route,
    candidate,
    destination,
    now,
    practicalDeadline,
    localDirectDurationMs,
  }) {
    const icArrival = new Date(now.getTime() + candidate.localDurationMs);
    const fastRoute = await computeFastLeg(Route, candidate.waypoint, destination, icArrival);
    if (!fastRoute) return { ...candidate, failed: true };

    const fastDurationMs = Number(fastRoute.durationMillis || 0);
    if (!fastDurationMs) return { ...candidate, failed: true };
    const totalDurationMs = candidate.localDurationMs + fastDurationMs;
    const destinationEta = new Date(now.getTime() + totalDurationMs);
    const switchDeadline = new Date(practicalDeadline.getTime() - fastDurationMs);
    const googleToll = extractTollMoney(fastRoute);
    const safe = destinationEta <= practicalDeadline;
    const timeSavedMs = Math.max(0, localDirectDurationMs - totalDurationMs);
    const endpoints = routeEndpoints(fastRoute);

    return {
      ...candidate,
      failed: false,
      fastDurationMs,
      totalDurationMs,
      icArrival,
      destinationEta,
      switchDeadline,
      toll: { ...googleToll, source: 'Google' },
      endpoints,
      safe,
      timeSavedMs,
    };
  }

  function navGuidanceLevel(remainingMs) {
    if (!Number.isFinite(remainingMs) || remainingMs <= NAV_GUIDANCE_NOW_MS) return 'now';
    if (remainingMs <= NAV_GUIDANCE_PREPARE_MS) return 'prepare';
    return 'later';
  }

  function refreshNavGuidance(guidance, now) {
    if (!guidance || !(guidance.changeBy instanceof Date)) return guidance;
    const remainingMs = guidance.changeBy.getTime() - now.getTime();
    return { ...guidance, remainingMs, level: navGuidanceLevel(remainingMs) };
  }

  function fallbackNavGuidance(candidate, now) {
    const entrySlackMs = candidate?.switchDeadline instanceof Date && candidate?.icArrival instanceof Date
      ? candidate.switchDeadline.getTime() - candidate.icArrival.getTime()
      : 0;
    const conservativeMs = Math.max(0, Math.min(entrySlackMs * 0.5, 20 * 60_000));
    const changeBy = new Date(now.getTime() + conservativeMs);
    return {
      changeBy,
      remainingMs: conservativeMs,
      level: navGuidanceLevel(conservativeMs),
      computedAt: new Date(now),
      method: 'fallback',
    };
  }

  async function enrichNavigationGuidance({ Route, RouteMatrix, origin, candidate, now, localRoute }) {
    const routePath = normalizeRoutePath(localRoute?.path);
    if (routePath.length < 2 || !(candidate.switchDeadline instanceof Date)) {
      return { ...candidate, navGuidance: fallbackNavGuidance(candidate, now) };
    }

    const cumulative = cumulativePathDistances(routePath);
    const routeTotal = cumulative.at(-1) || 0;
    const candidateProgress = Number.isFinite(candidate.routeProgressMeters)
      ? candidate.routeProgressMeters
      : Math.min(routeTotal, Number(candidate.localDistanceMeters || 0));
    const searchEnd = Math.min(routeTotal, Math.max(candidateProgress + 35_000, candidateProgress * 1.15, 35_000));
    if (!(searchEnd > 1_000)) return { ...candidate, navGuidance: fallbackNavGuidance(candidate, now) };

    const sampleCandidates = [];
    for (let i = 1; i <= NAV_GUIDANCE_SAMPLE_COUNT; i += 1) {
      const progress = searchEnd * (i / NAV_GUIDANCE_SAMPLE_COUNT);
      const waypoint = interpolatePathAtDistance(routePath, cumulative, progress);
      if (!waypoint) continue;
      sampleCandidates.push({
        id: `nav-guidance-${i}`,
        name: `走行継続${i}`,
        waypoint,
        routeProgressMeters: progress,
      });
    }

    const timedSamples = await attachLocalMatrix(RouteMatrix, origin, sampleCandidates, now);
    const evaluated = await mapWithConcurrency(timedSamples.filter((item) => item.exists && item.localDurationMs > 0), 4, async (sample) => {
      const departureAtSample = new Date(now.getTime() + sample.localDurationMs);
      const localToIc = await computeLocalLeg(Route, sample.waypoint, candidate.waypoint, departureAtSample);
      const toIcMs = Number(localToIc?.durationMillis || 0);
      if (!toIcMs) return { ...sample, safeForIc: false, arrivalAtIc: null };
      const arrivalAtIc = new Date(departureAtSample.getTime() + toIcMs);
      return {
        ...sample,
        departureAtSample,
        toIcMs,
        arrivalAtIc,
        safeForIc: arrivalAtIc <= candidate.switchDeadline,
      };
    });

    const safeSamples = evaluated.filter((item) => item.safeForIc).sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    if (!safeSamples.length) {
      return {
        ...candidate,
        navGuidance: {
          changeBy: new Date(now),
          remainingMs: 0,
          level: 'now',
          computedAt: new Date(now),
          method: 'route-sampling',
        },
      };
    }

    const latestSafe = safeSamples.at(-1);
    const changeBy = new Date(now.getTime() + latestSafe.localDurationMs);
    const remainingMs = changeBy.getTime() - now.getTime();
    return {
      ...candidate,
      navGuidance: {
        changeBy,
        remainingMs,
        level: navGuidanceLevel(remainingMs),
        computedAt: new Date(now),
        method: 'route-sampling',
        sampledProgressMeters: latestSafe.routeProgressMeters,
      },
    };
  }

  async function computeLocalLeg(Route, origin, destination, departureTime) {
    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      language: 'ja',
      fields: ['durationMillis', 'distanceMeters'],
      routeModifiers: {
        avoidHighways: true,
        avoidTolls: true,
        avoidFerries: true,
      },
    };
    applyFutureDepartureTime(request, departureTime);
    const result = await Route.computeRoutes(request);
    return result.routes?.[0] || null;
  }

  async function adaptiveBoundarySearch({
    Route,
    candidates,
    destination,
    now,
    practicalDeadline,
    localDirectDurationMs,
  }) {
    const ordered = candidates.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    const cache = new Map();
    const evaluateIndex = async (index) => {
      const candidate = ordered[index];
      if (!candidate) return null;
      if (!cache.has(candidate.id)) {
        cache.set(candidate.id, await evaluateCandidateTiming({
          Route,
          candidate,
          destination,
          now,
          practicalDeadline,
          localDirectDurationMs,
        }));
      }
      return cache.get(candidate.id);
    };

    const first = await evaluateIndex(0);
    if (!first || first.failed || !first.safe) {
      // This violates the usual monotonic picture (nearby entry unsafe, later
      // entry potentially safe). Probe all coarse checkpoints rather than
      // incorrectly declaring that no solution exists.
      for (let index = 1; index < ordered.length; index += 1) await evaluateIndex(index);
      const fallbackSafe = [...cache.values()]
        .filter((item) => item && !item.failed && item.safe)
        .sort((a, b) => b.routeProgressMeters - a.routeProgressMeters);
      return {
        boundary: fallbackSafe[0] || null,
        evaluated: [...cache.values()],
        lowerIndex: null,
        upperIndex: null,
        kind: fallbackSafe.length ? 'nonmonotonic-fallback' : 'none',
      };
    }

    if (ordered.length === 1) {
      return { boundary: first, evaluated: [...cache.values()], lowerIndex: 0, upperIndex: null, kind: 'horizon-edge' };
    }

    const lastIndex = ordered.length - 1;
    const last = await evaluateIndex(lastIndex);
    if (last && !last.failed && last.safe) {
      return { boundary: last, evaluated: [...cache.values()], lowerIndex: lastIndex, upperIndex: null, kind: 'horizon-edge' };
    }

    let low = 0;
    let high = lastIndex;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const result = await evaluateIndex(mid);
      if (result && !result.failed && result.safe) low = mid;
      else high = mid;
    }

    // Evaluate immediate neighbours around the boundary to soften the monotonic
    // assumption. Traffic/topology can cause small local reversals.
    const neighbourIndexes = [low - 1, low, high, high + 1]
      .filter((index) => index >= 0 && index < ordered.length);
    for (const index of [...new Set(neighbourIndexes)]) await evaluateIndex(index);

    const safeEvaluated = [...cache.values()]
      .filter((item) => item && !item.failed && item.safe)
      .sort((a, b) => b.routeProgressMeters - a.routeProgressMeters);
    return {
      boundary: safeEvaluated[0] || null,
      evaluated: [...cache.values()],
      lowerIndex: low,
      upperIndex: high,
      kind: safeEvaluated.length ? 'deadline-boundary' : 'none',
    };
  }

  function selectProgressRepresentatives(candidates, limit, perBin = 1) {
    const ordered = candidates.slice().sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    if (ordered.length <= limit) return ordered;
    const takePerBin = Math.max(1, Math.floor(perBin));
    const binCount = Math.max(1, Math.ceil(limit / takePerBin));
    const minProgress = ordered[0].routeProgressMeters;
    const maxProgress = ordered[ordered.length - 1].routeProgressMeters;
    const span = Math.max(1, maxProgress - minProgress);
    const bins = Array.from({ length: binCount }, () => []);

    for (const candidate of ordered) {
      const ratio = (candidate.routeProgressMeters - minProgress) / span;
      const index = Math.min(binCount - 1, Math.max(0, Math.floor(ratio * binCount)));
      bins[index].push(candidate);
    }

    const selected = [];
    for (const bin of bins) {
      bin.sort((a, b) => (a.corridorDistanceMeters - b.corridorDistanceMeters)
        || (a.routeProgressMeters - b.routeProgressMeters));
      selected.push(...bin.slice(0, takePerBin));
    }

    // Always preserve the leading and trailing route-progress checkpoints.
    selected.push(ordered[0], ordered[ordered.length - 1]);
    let unique = dedupeCandidates(selected)
      .sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
    while (unique.length > limit) {
      let removeIndex = -1;
      let worstDistance = -1;
      for (let i = 1; i < unique.length - 1; i += 1) {
        const distance = Number(unique[i].corridorDistanceMeters || 0);
        if (distance > worstDistance) {
          worstDistance = distance;
          removeIndex = i;
        }
      }
      if (removeIndex < 0) break;
      unique.splice(removeIndex, 1);
    }
    return unique.slice(0, limit);
  }

  function dedupeCandidates(candidates) {
    const map = new Map();
    for (const candidate of candidates) {
      if (!candidate?.id) continue;
      const existing = map.get(candidate.id);
      // Prefer the richer evaluated/priced version of the same candidate.
      if (!existing
        || (candidate.fastDurationMs && !existing.fastDurationMs)
        || (candidate.toll?.source === 'NAVITIME' && existing.toll?.source !== 'NAVITIME')) {
        map.set(candidate.id, candidate);
      }
    }
    return [...map.values()];
  }

  async function discoverInterchangesAdaptive(routePath) {
    const cacheKey = routeDiscoveryCacheKey(routePath);
    const cached = OSM_ROUTE_CACHE.get(cacheKey);
    if (cached) return cached;

    const initialRaw = await discoverInterchangesAlongRoute(routePath, INITIAL_CORRIDOR_KM);
    let candidates = projectAndFilterCandidates(initialRaw, routePath, INITIAL_CORRIDOR_KM);
    const coverage = routeCandidateCoverage(candidates, routePath, COVERAGE_BIN_COUNT);
    let expanded = false;

    if (candidates.length < 18 || coverage < MIN_ROUTE_COVERAGE) {
      const expandedRaw = await discoverInterchangesAlongRoute(routePath, EXPANDED_CORRIDOR_KM);
      candidates = projectAndFilterCandidates(expandedRaw, routePath, EXPANDED_CORRIDOR_KM);
      expanded = true;
    }

    const result = { candidates, expanded, coverage };
    OSM_ROUTE_CACHE.set(cacheKey, result);
    if (OSM_ROUTE_CACHE.size > 4) OSM_ROUTE_CACHE.delete(OSM_ROUTE_CACHE.keys().next().value);
    return result;
  }

  function projectAndFilterCandidates(rawCandidates, routePath, radiusKm) {
    return rawCandidates
      .map((candidate) => ({ ...candidate, ...projectPointToRoute(candidate.waypoint, routePath) }))
      .filter((candidate) => Number.isFinite(candidate.corridorDistanceMeters)
        && candidate.corridorDistanceMeters <= radiusKm * 1000 * 1.08)
      .sort((a, b) => a.routeProgressMeters - b.routeProgressMeters);
  }

  function routeCandidateCoverage(candidates, routePath, binCount) {
    const total = cumulativePathDistances(routePath).at(-1) || 0;
    if (!total || !candidates.length) return 0;
    const occupied = new Set();
    for (const candidate of candidates) {
      const ratio = Math.max(0, Math.min(0.999999, candidate.routeProgressMeters / total));
      occupied.add(Math.floor(ratio * binCount));
    }
    return occupied.size / binCount;
  }

  function routeDiscoveryCacheKey(routePath) {
    const total = cumulativePathDistances(routePath).at(-1) || 0;
    const first = routePath[0];
    const last = routePath[routePath.length - 1];
    return [first?.lat?.toFixed(3), first?.lng?.toFixed(3), last?.lat?.toFixed(3), last?.lng?.toFixed(3), Math.round(total / 5000)].join(':');
  }

  async function discoverInterchangesAlongRoute(routePath, corridorRadiusKm) {
    const samples = sampleRouteForOverpass(routePath, corridorRadiusKm);
    const boxes = samples.map((point) => bboxAround(point, corridorRadiusKm));
    const query = buildOverpassIcQuery(boxes);
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`,
        });
        const text = await response.text();
        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}: ${text.slice(0, 160)}`);
        const data = JSON.parse(text);
        return parseOverpassIcCandidates(data);
      } catch (error) {
        console.warn('Overpass endpoint failed:', endpoint, error);
        lastError = error;
      }
    }

    throw new Error(`OpenStreetMapのIC探索に失敗しました。${shortError(lastError)}`);
  }

  function buildOverpassIcQuery(boxes) {
    const statements = boxes.map((box) => (
      `node["highway"="motorway_junction"](${box.south.toFixed(5)},${box.west.toFixed(5)},${box.north.toFixed(5)},${box.east.toFixed(5)});`
    )).join('\n');
    return `[out:json][timeout:30];\n(\n${statements}\n);\nout body;`;
  }

  function parseOverpassIcCandidates(data) {
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const grouped = new Map();

    for (const element of elements) {
      if (element?.type !== 'node') continue;
      const tags = element.tags || {};
      const rawName = String(tags['name:ja'] || tags.name || '').trim();
      if (!rawName) continue;
      if (isJunctionOnlyName(rawName)) continue;

      const lat = Number(element.lat);
      const lng = Number(element.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const key = normalizeIcKey(rawName);
      if (!key) continue;
      const existing = grouped.get(key) || {
        id: `osm-${element.id}`,
        name: rawName,
        latSum: 0,
        lngSum: 0,
        count: 0,
        refs: new Set(),
      };
      existing.latSum += lat;
      existing.lngSum += lng;
      existing.count += 1;
      if (tags.ref) existing.refs.add(String(tags.ref));
      grouped.set(key, existing);
    }

    return [...grouped.values()].map((group) => {
      const waypoint = {
        lat: group.latSum / group.count,
        lng: group.lngSum / group.count,
      };
      const refs = [...group.refs].join(' / ');
      return {
        id: group.id,
        name: group.name,
        road: refs ? `OpenStreetMap / 出口番号 ${refs}` : 'OpenStreetMapで検出',
        waypoint,
        source: 'OSM',
      };
    });
  }

  function isJunctionOnlyName(name) {
    const hasJct = /JCT|ジャンクション/i.test(name);
    const alsoHasLocalAccess = /IC|インターチェンジ|出入口|入口|出口/i.test(name);
    return hasJct && !alsoHasLocalAccess;
  }

  function normalizeIcKey(name) {
    return String(name)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/インターチェンジ/g, 'ic')
      .replace(/[\s・･._-]+/g, '')
      .trim();
  }

  function normalizeRoutePath(path) {
    if (!Array.isArray(path)) return [];
    return path.map(readCoordinate).filter(Boolean);
  }

  function readCoordinate(point) {
    if (!point) return null;
    const latRaw = typeof point.lat === 'function' ? point.lat() : (point.lat ?? point.latitude);
    const lngRaw = typeof point.lng === 'function' ? point.lng() : (point.lng ?? point.longitude);
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function sampleRouteForOverpass(routePath, corridorRadiusKm) {
    const cumulative = cumulativePathDistances(routePath);
    const totalMeters = cumulative[cumulative.length - 1] || 0;
    if (totalMeters <= 0) return [routePath[0]];

    const desiredStepKm = Math.min(OVERPASS_MIN_SAMPLE_STEP_KM, Math.max(8, corridorRadiusKm * 1.5));
    const desiredStep = desiredStepKm * 1000;
    const capStep = totalMeters / Math.max(1, OVERPASS_MAX_SAMPLE_POINTS - 1);
    const stepMeters = Math.max(desiredStep, capStep);
    const samples = [];
    for (let target = 0; target < totalMeters; target += stepMeters) {
      samples.push(interpolatePathAtDistance(routePath, cumulative, target));
    }
    samples.push(routePath[routePath.length - 1]);
    return samples.filter(Boolean).slice(0, OVERPASS_MAX_SAMPLE_POINTS);
  }

  function cumulativePathDistances(path) {
    const cumulative = new Array(path.length).fill(0);
    for (let i = 1; i < path.length; i += 1) {
      cumulative[i] = cumulative[i - 1] + haversineMeters(path[i - 1], path[i]);
    }
    return cumulative;
  }

  function interpolatePathAtDistance(path, cumulative, targetMeters) {
    if (targetMeters <= 0) return path[0];
    const total = cumulative[cumulative.length - 1];
    if (targetMeters >= total) return path[path.length - 1];
    let index = 1;
    while (index < cumulative.length && cumulative[index] < targetMeters) index += 1;
    const start = path[index - 1];
    const end = path[index];
    const segment = cumulative[index] - cumulative[index - 1];
    const ratio = segment > 0 ? (targetMeters - cumulative[index - 1]) / segment : 0;
    return {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    };
  }

  function bboxAround(point, radiusKm) {
    const latDelta = radiusKm / 111.32;
    const cosLat = Math.max(0.15, Math.cos(point.lat * Math.PI / 180));
    const lngDelta = radiusKm / (111.32 * cosLat);
    return {
      south: point.lat - latDelta,
      west: point.lng - lngDelta,
      north: point.lat + latDelta,
      east: point.lng + lngDelta,
    };
  }

  function projectPointToRoute(point, routePath) {
    const cumulative = cumulativePathDistances(routePath);
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestProgress = 0;

    for (let i = 0; i < routePath.length - 1; i += 1) {
      const a = toLocalMeters(routePath[i], point);
      const b = toLocalMeters(routePath[i + 1], point);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const denom = dx * dx + dy * dy;
      const t = denom > 0 ? clampNumber(-(a.x * dx + a.y * dy) / denom, 0, 1, 0) : 0;
      const nx = a.x + t * dx;
      const ny = a.y + t * dy;
      const distance = Math.hypot(nx, ny);
      if (distance < bestDistance) {
        bestDistance = distance;
        const segmentMeters = cumulative[i + 1] - cumulative[i];
        bestProgress = cumulative[i] + segmentMeters * t;
      }
    }

    return {
      corridorDistanceMeters: bestDistance,
      routeProgressMeters: bestProgress,
    };
  }

  function toLocalMeters(coord, origin) {
    const latScale = 111_320;
    const lngScale = 111_320 * Math.max(0.15, Math.cos(origin.lat * Math.PI / 180));
    return {
      x: (coord.lng - origin.lng) * lngScale,
      y: (coord.lat - origin.lat) * latScale,
    };
  }

  function haversineMeters(a, b) {
    const radius = 6_371_000;
    const toRad = (value) => value * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  async function computeFastLeg(Route, origin, destination, departureTime) {
    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      language: 'ja',
      fields: ['durationMillis', 'distanceMeters', 'travelAdvisory', 'legs'],
      extraComputations: ['TOLLS'],
      routeModifiers: {
        vehicleInfo: { emissionType: 'GASOLINE' },
        tollPasses: ['JP_ETC'],
      },
    };

    // Routes Library only accepts an explicitly supplied departureTime when it
    // is in the future. For an immediate departure, omit the field and Google
    // automatically uses the request time. Add a small guard band so network
    // latency cannot turn a just-created Date into a past timestamp.
    if (departureTime instanceof Date && departureTime.getTime() > Date.now() + 30_000) {
      request.departureTime = departureTime;
    }

    const result = await Route.computeRoutes(request);
    return result.routes?.[0] || null;
  }

  async function refineSwitchDeadline(Route, candidate, destination, practicalDeadline, now) {
    const firstDeadline = candidate.switchDeadline;
    // If the first estimate is effectively "now", refinement is not useful;
    // computeFastLeg will use live traffic by omitting departureTime.
    const departureTime = firstDeadline.getTime() > Date.now() + 30_000 ? firstDeadline : null;
    try {
      const deadlineRoute = await computeFastLeg(Route, candidate.waypoint, destination, departureTime);
      const deadlineDurationMs = Number(deadlineRoute?.durationMillis || 0);
      if (!deadlineDurationMs) return candidate;
      return {
        ...candidate,
        switchDeadline: new Date(practicalDeadline.getTime() - deadlineDurationMs),
        deadlineFastDurationMs: deadlineDurationMs,
      };
    } catch (error) {
      console.warn('Deadline refinement failed:', error);
      return candidate;
    }
  }

  function renderCandidateList(candidates, selectedId = null, referenceDate = new Date(), practicalDeadline = null) {
    els.candidateList.replaceChildren();
    if (!candidates.length) return;

    for (const candidate of candidates) {
      const article = document.createElement('article');
      article.className = `candidate-item${candidate.id === selectedId ? ' selected' : ''}`;

      const top = document.createElement('div');
      top.className = 'candidate-top';
      const nameWrap = document.createElement('div');
      const name = document.createElement('p');
      name.className = 'candidate-name';
      name.textContent = candidate.name;
      const road = document.createElement('p');
      road.className = 'candidate-road';
      road.textContent = candidate.road;
      nameWrap.append(name, road);

      const status = document.createElement('span');
      status.className = `status-pill ${candidate.safe ? 'status-safe' : 'status-late'}`;
      status.textContent = candidate.safe ? '条件内' : '期限超過';
      top.append(nameWrap, status);

      const grid = document.createElement('div');
      grid.className = 'candidate-grid';
      grid.append(
        candidateFact('IC到着', formatMoment(candidate.icArrival, referenceDate)),
        candidateFact('目的地到着予想', formatMoment(candidate.destinationEta, referenceDate)),
        candidateFact('到着余裕', practicalDeadline && candidate.destinationEta ? formatSignedDuration(practicalDeadline.getTime() - candidate.destinationEta.getTime()) : '—'),
        candidateFact('切替期限', `≈ ${formatMoment(candidate.switchDeadline, referenceDate)}`),
        candidateFact('ETC料金', formatToll(candidate)),
      );

      const note = document.createElement('p');
      note.className = 'candidate-note';
      const effect = candidate.timeSavedMs > 0 ? `下道のみより ${formatDuration(candidate.timeSavedMs)}短縮` : '下道のみと大差なし';
      const fareNote = candidate.navitimeFareError ? ' / ETC料金は取得できませんでした' : '';
      note.textContent = `ICまで下道 ${formatDuration(candidate.localDurationMs)}・${formatDistance(candidate.localDistanceMeters)} / ${effect}${fareNote}`;

      article.append(top, grid, note);
      els.candidateList.append(article);
    }
  }

  function candidateFact(label, value) {
    const div = document.createElement('div');
    const span = document.createElement('span');
    const strong = document.createElement('strong');
    span.textContent = label;
    strong.textContent = value;
    div.append(span, strong);
    return div;
  }

  function renderSwitchSummary(candidate, now, practicalDeadline = null) {
    if (!candidate) {
      els.switchSummary.classList.add('hidden');
      return;
    }

    const remainingMs = candidate.switchDeadline.getTime() - now.getTime();
    const hasNavitimeFare = Number.isFinite(candidate.toll?.yen) && candidate.toll?.source === 'NAVITIME';
    els.switchModeLabel.textContent = hasNavitimeFare
      ? '期限直前候補を含む比較範囲でETC料金が最安'
      : '料金比較不能：時間ベースの暫定候補';
    els.switchIc.textContent = candidate.name;
    els.switchRoad.textContent = candidate.road;
    els.switchArrival.textContent = formatMoment(candidate.icArrival, now);
    els.switchDeadline.textContent = `≈ ${formatMoment(candidate.switchDeadline, now)}`;
    els.switchRemaining.textContent = remainingMs >= 0 ? formatDuration(remainingMs) : `超過 ${formatDuration(Math.abs(remainingMs))}`;
    if (els.navChangeAdvice) {
      const guidance = candidate.navGuidance;
      if (guidance?.changeBy instanceof Date) {
        const navRemainingMs = guidance.changeBy.getTime() - now.getTime();
        els.navChangeAdvice.textContent = guidance.level === 'now'
          ? '今すぐ変更'
          : `${formatMoment(guidance.changeBy, now)}（あと約${formatDuration(Math.max(0, navRemainingMs))}）`;
      } else {
        els.navChangeAdvice.textContent = '早めに変更';
      }
    }
    els.switchDestinationEta.textContent = formatMoment(candidate.destinationEta, now);
    els.switchToll.textContent = formatToll(candidate);
    els.switchSummary.classList.remove('hidden');
  }

  function resetCandidateUi() {
    els.candidateStatus.textContent = '下道ルート全体からIC候補を自動探索しています…';
    els.candidateCount.textContent = '—';
    els.candidateList.replaceChildren();
    els.switchSummary.classList.add('hidden');
  }

  function getOrigin() {
    if (currentPosition) return { lat: currentPosition.lat, lng: currentPosition.lng };
    const manual = els.manualOrigin.value.trim();
    return manual || null;
  }

  async function diagnoseGoogleApi() {
    const key = getApiKey();
    const box = els.googleDiagResult;
    if (!box) return;
    box.classList.remove('hidden');
    if (!key) {
      box.textContent = '診断: Google Maps APIキーが未設定です。';
      return;
    }

    const lines = [
      'Deadline Navi Google API 診断',
      `ページURL: ${location.href}`,
      `Origin: ${location.origin}`,
      `APIキー: ${maskKey(key)}`,
      `オンライン: ${navigator.onLine ? 'yes' : 'no'}`,
    ];
    box.textContent = `${lines.join('\n')}\n\n診断中…`;
    els.googleDiag.disabled = true;

    const captured = [];
    const originalConsoleError = console.error;
    const captureConsoleError = (...args) => {
      try { captured.push(args.map((x) => String(x)).join(' ')); } catch (_) { /* no-op */ }
      originalConsoleError.apply(console, args);
    };
    console.error = captureConsoleError;

    const errorEvents = [];
    const onWindowError = (event) => {
      const msg = event?.message || event?.error?.message;
      if (msg) errorEvents.push(String(msg));
    };
    window.addEventListener('error', onWindowError);

    try {
      lines.push('');
      lines.push('1) Maps JavaScript API / Routes Library 読み込み…');
      box.textContent = lines.join('\n');
      const { Route } = await loadGoogleRoutes(key);
      lines.push('   OK: routes library loaded');

      lines.push('2) Route.computeRoutes 最小テスト…');
      box.textContent = lines.join('\n');
      const test = await Route.computeRoutes({
        origin: { lat: 35.0116, lng: 135.7681 },
        destination: { lat: 35.0210, lng: 135.7720 },
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        fields: ['durationMillis', 'distanceMeters'],
      });
      const route = test?.routes?.[0];
      if (!route) throw new Error('診断用ルートが返りませんでした。');
      lines.push(`   OK: ${Math.round(Number(route.distanceMeters || 0))}m / ${Math.round(Number(route.durationMillis || 0) / 1000)}秒`);
      lines.push('');
      lines.push('Google側の基本認証は正常です。通常計算で失敗する場合は、リクエスト内容側の問題です。');
    } catch (error) {
      const raw = extractErrorDetails(error);
      lines.push('');
      lines.push('失敗しました。');
      lines.push(`生エラー: ${raw}`);
      if (captured.length) {
        lines.push('');
        lines.push('console.error:');
        captured.slice(-6).forEach((x) => lines.push(`- ${x}`));
      }
      if (errorEvents.length) {
        lines.push('');
        lines.push('window error:');
        errorEvents.slice(-6).forEach((x) => lines.push(`- ${x}`));
      }
      lines.push('');
      lines.push('この診断結果をそのまま共有してください。APIキー本体は表示されません。');
    } finally {
      console.error = originalConsoleError;
      window.removeEventListener('error', onWindowError);
      box.textContent = lines.join('\n');
      els.googleDiag.disabled = false;
    }
  }

  function maskKey(key) {
    if (!key) return '(none)';
    if (key.length <= 10) return `${key.slice(0, 3)}… (${key.length}文字)`;
    return `${key.slice(0, 6)}…${key.slice(-4)} (${key.length}文字)`;
  }

  function extractErrorDetails(error) {
    const parts = [];
    if (error?.name) parts.push(`name=${error.name}`);
    if (error?.code !== undefined) parts.push(`code=${String(error.code)}`);
    if (error?.status !== undefined) parts.push(`status=${String(error.status)}`);
    if (error?.message) parts.push(`message=${error.message}`);
    if (!parts.length) parts.push(String(error || 'unknown'));
    try {
      if (error && typeof error === 'object') {
        const own = {};
        for (const k of Object.keys(error)) own[k] = error[k];
        if (Object.keys(own).length) parts.push(`details=${JSON.stringify(own)}`);
      }
    } catch (_) { /* no-op */ }
    return parts.join(' | ');
  }

  async function loadGoogleRoutes(apiKey) {
    if (window.google?.maps?.importLibrary) {
      return google.maps.importLibrary('routes');
    }
    if (mapsLoadPromise) return mapsLoadPromise;

    mapsLoadPromise = new Promise((resolve, reject) => {
      const callbackName = `deadlineNaviGoogleReady_${Date.now()}`;
      const script = document.createElement('script');
      const previousAuthFailure = window.gm_authFailure;
      let settled = false;
      const cleanup = () => {
        if (window.gm_authFailure === authFailureHandler) {
          if (previousAuthFailure) window.gm_authFailure = previousAuthFailure;
          else delete window.gm_authFailure;
        }
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        mapsLoadPromise = null;
        reject(error);
      };
      const authFailureHandler = () => {
        fail(new Error(`Google Maps JavaScript API authentication failed (gm_authFailure). origin=${location.origin}`));
      };
      window.gm_authFailure = authFailureHandler;
      const timeoutId = window.setTimeout(() => {
        fail(new Error(`Google Maps JavaScript API load timeout. origin=${location.origin}`));
      }, 15000);
      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
        callback: callbackName,
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;

      window[callbackName] = async () => {
        try {
          delete window[callbackName];
          const routesLibrary = await google.maps.importLibrary('routes');
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          resolve(routesLibrary);
        } catch (error) {
          window.clearTimeout(timeoutId);
          fail(error);
        }
      };

      script.onerror = () => {
        delete window[callbackName];
        window.clearTimeout(timeoutId);
        fail(new Error(`Google Maps JavaScript API script load failed. origin=${location.origin}`));
      };

      document.head.appendChild(script);
    });

    return mapsLoadPromise;
  }

  function renderResults({ normalRoute, localRoute, deadline, safetyMarginMin, now, reference, scroll = true }) {
    const normalDurationMs = Number(normalRoute.durationMillis || 0);
    const localDurationMs = Number(localRoute.durationMillis || 0);

    if (!normalDurationMs || !localDurationMs) {
      throw new Error('所要時間を取得できませんでした。');
    }

    const normalEta = new Date(now.getTime() + normalDurationMs);
    const localEta = new Date(now.getTime() + localDurationMs);
    const marginMs = safetyMarginMin * 60_000;
    const practicalDeadline = new Date(deadline.getTime() - marginMs);
    const slackMs = practicalDeadline.getTime() - localEta.getTime();
    const timeSavedMs = Math.max(0, localDurationMs - normalDurationMs);

    els.localEta.textContent = formatMoment(localEta, now);
    els.fastEta.textContent = formatMoment(normalEta, now);
    els.localDuration.textContent = formatDuration(localDurationMs);
    els.fastDuration.textContent = formatDuration(normalDurationMs);
    els.timeSaved.textContent = timeSavedMs > 0 ? formatDuration(timeSavedMs) : 'ほぼ同じ';
    els.tollPrice.textContent = 'ETC料金 NAVITIME取得中…';
    els.slack.textContent = formatSignedDuration(slackMs);
    els.localDistance.textContent = formatDistance(localRoute.distanceMeters);
    els.fastDistance.textContent = formatDistance(normalRoute.distanceMeters);
    els.deadlineDisplay.textContent = formatDateTime(deadline);
    els.marginDisplay.textContent = `${safetyMarginMin}分`;
    els.calculatedAt.textContent = `最終更新 ${formatMoment(now, new Date())}`;

    updateDecision({ slackMs, normalEta, practicalDeadline, timeSavedMs });

    els.resultSection.classList.remove('hidden');
    if (scroll) els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderNoTollNeeded(localEta, practicalDeadline, now) {
    const slackMs = practicalDeadline.getTime() - localEta.getTime();
    els.candidateCount.textContent = '0円';
    els.candidateStatus.textContent = '下道だけで安全マージン込みの到着期限を守れます。目的関数が「締切を守りつつ追加料金最小」なので、最適解は高速を使わず0円です。IC探索・料金比較は省略しました。';
    els.candidateList.replaceChildren();
    els.switchModeLabel.textContent = '現在の最安案';
    els.switchIc.textContent = '高速に乗らない';
    els.switchRoad.textContent = '下道ルートを継続';
    els.switchArrival.textContent = '—';
    els.switchDeadline.textContent = 'まだ不要';
    els.switchRemaining.textContent = formatDuration(Math.max(0, slackMs));
    els.switchDestinationEta.textContent = formatMoment(localEta, now);
    els.switchToll.textContent = '0円';
    els.switchSummary.classList.remove('hidden');
  }

  function updateDecision({ slackMs, normalEta, practicalDeadline, timeSavedMs }) {
    els.decisionCard.classList.remove('good', 'warn', 'danger');

    const minutes = slackMs / 60_000;
    if (minutes >= 20) {
      els.decisionCard.classList.add('good');
      els.decisionText.textContent = '高速不要：下道が最安';
      els.decisionSubtext.textContent = `安全マージン込みでも約${Math.floor(minutes)}分の余裕があります。到着期限を守りつつ追加料金を最小化するなら、高速料金0円の下道継続が最適です。`;
    } else if (minutes >= 0) {
      els.decisionCard.classList.add('warn');
      els.decisionText.textContent = '高速不要：ただし余裕は小さい';
      els.decisionSubtext.textContent = `安全マージン込みの余裕は約${Math.max(0, Math.floor(minutes))}分です。現時点の最小追加料金は0円ですが、自動再計算で余裕の減少を監視するのが適切です。`;
    } else if (normalEta <= practicalDeadline) {
      els.decisionCard.classList.add('danger');
      els.decisionText.textContent = '高速への切替を検討';
      els.decisionSubtext.textContent = `下道ルートでは安全余裕を割り込みます。Google推奨ルートなら条件内です。高速の時短効果は約${formatDuration(timeSavedMs)}です。`;
    } else {
      els.decisionCard.classList.add('danger');
      els.decisionText.textContent = 'Google推奨ルートでも期限が厳しい';
      els.decisionSubtext.textContent = '現在の交通状況では、Google推奨ルートでも安全マージン込みの到着期限を超える見込みです。';
    }
  }

  async function updateNormalNavitimeFare(normalRoute, departureTime, apiKey) {
    const endpoints = routeEndpoints(normalRoute);
    if (!endpoints?.start || !endpoints?.goal) {
      throw new Error('Google推奨ルートの座標を取得できませんでした。');
    }
    const fare = await fetchNavitimeEtcFare({
      apiKey,
      start: endpoints.start,
      goal: endpoints.goal,
      departureTime,
      startName: '現在地',
      forceTollStart: false,
    });
    els.tollPrice.textContent = `ETC ${fare.text}（NAVITIME・有料優先）`;
  }

  async function fetchNavitimeEtcFare({ apiKey, start, startIcId = null, goal, departureTime, startName = '高速入口', forceTollStart = false }) {
    const params = new URLSearchParams();
    const startPoint = startIcId
      ? { ic: String(startIcId), name: startName }
      : { lat: start.lat, lon: start.lng, name: startName };
    if (!startIcId && forceTollStart) startPoint['road-type'] = 'toll';
    const goalPoint = { lat: goal.lat, lon: goal.lng, name: '目的地', 'road-type': 'any' };

    params.set('start', JSON.stringify(startPoint));
    params.set('goal', JSON.stringify(goalPoint));
    params.set('condition', 'toll_time');
    params.set('start_time', toNavitimeDateTime(departureTime));
    params.set('etc', 'use');
    params.set('smart_ic', 'use');
    params.set('ferry', 'unuse');
    params.set('datum', 'wgs84');
    params.set('coord_unit', 'degree');

    let response;
    try {
      response = await fetch(`${NAVITIME_ROUTE_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': NAVITIME_HOST,
        },
      });
    } catch (error) {
      throw new Error(`NAVITIMEへ接続できませんでした。file:// でCORSエラーになる場合はGitHub Pages等のHTTPS上で試してください。${shortError(error)}`);
    }

    const rawText = await response.text();
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; } catch (_) { /* keep text */ }

    if (!response.ok) {
      const detail = data?.message || data?.error || data?.errors || rawText || response.statusText;
      throw new Error(`NAVITIME HTTP ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }

    const yen = parseNavitimeEtcFare(data);
    if (!Number.isFinite(yen)) {
      throw new Error('NAVITIMEのレスポンスに普通車ETC料金が見つかりませんでした。');
    }
    return {
      yen: Math.round(yen),
      text: `${Math.round(yen).toLocaleString('ja-JP')}円`,
      source: 'NAVITIME',
    };
  }

  function parseNavitimeEtcFare(data) {
    const route = data?.items?.[0];
    if (!route) return null;

    // NAVITIME documents the whole-route ETC fare under
    // items > summary > move > fare > unit_1025_2 for an ordinary passenger car.
    // This whole-route value already reflects time/day-dependent ETC discounts.
    const summaryFare = route?.summary?.move?.fare;
    const standardEtc = Number(summaryFare?.unit_1025_2);
    if (Number.isFinite(standardEtc) && standardEtc >= 0) return standardEtc;

    // Some responses under etc=use may expose only one applicable ordinary-car
    // ETC key. Accept an ETC-family key (_1025/_1026 etc.) as a defensive fallback,
    // but do not sum per-section discount alternatives: those are not additive.
    if (summaryFare && typeof summaryFare === 'object') {
      const etcCandidates = Object.entries(summaryFare)
        .filter(([key, value]) => /^unit_(1025|1026)_2$/.test(key) && Number.isFinite(Number(value)))
        .map(([, value]) => Number(value))
        .filter((value) => value >= 0);
      if (etcCandidates.length) return Math.min(...etcCandidates);
    }

    return null;
  }

  function routeEndpoints(route) {
    const legs = Array.isArray(route?.legs) ? route.legs : [];
    if (!legs.length) return null;
    const start = coordinateFromDirectionalLocation(legs[0]?.startLocation);
    const goal = coordinateFromDirectionalLocation(legs[legs.length - 1]?.endLocation);
    if (!start || !goal) return null;
    return { start, goal };
  }

  function coordinateFromDirectionalLocation(location) {
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function toNavitimeDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function formatToll(candidate) {
    const toll = candidate?.toll;
    if (Number.isFinite(toll?.yen) && toll?.source === 'NAVITIME') return `${toll.text}（NAVITIME）`;
    if (candidate?.navitimeFareError) return '取得失敗';
    if (toll?.text) return `${toll.text}（Google参考）`;
    return '—';
  }

  function shortError(error) {
    const text = String(error?.message || error || '不明なエラー').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }

  function extractTollMoney(route) {
    const prices = route.travelAdvisory?.tollInfo?.estimatedPrices;
    if (!prices || prices.length === 0) {
      return { text: route.travelAdvisory?.tollInfo ? '推定額不明' : '情報なし / 料金なし', yen: null };
    }

    let yen = null;
    const text = prices.map((money) => {
      const unitsRaw = money.units ?? 0;
      const units = typeof unitsRaw === 'string' ? Number(unitsRaw) : unitsRaw;
      const nanos = Number(money.nanos ?? 0);
      const value = units + nanos / 1e9;
      const currency = money.currencyCode || 'JPY';
      if (currency === 'JPY') {
        const rounded = Math.round(value);
        if (yen === null) yen = rounded;
        return `${rounded.toLocaleString('ja-JP')}円`;
      }
      return `${value.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ${currency}`;
    }).join(' / ');
    return { text, yen };
  }

  async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) return;
        try {
          results[index] = await worker(items[index], index);
        } catch (error) {
          console.warn('Candidate request failed:', items[index]?.name, error);
          results[index] = { ...items[index], failed: true, error };
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
  }

  function normalizeApiError(error) {
    const text = String(error?.message || error || '不明なエラー');
    const raw = extractErrorDetails(error);
    if (/RefererNotAllowedMapError/i.test(text)) {
      return `Google APIのHTTPリファラー制限で拒否されています。生エラー：${raw}`;
    }
    if (/ApiTargetBlockedMapError/i.test(text)) {
      return `Google APIの「APIの制限」で必要なAPIが許可されていません。生エラー：${raw}`;
    }
    if (/ApiNotActivatedMapError|not activated/i.test(text)) {
      return `必要なGoogle APIが有効化されていません。生エラー：${raw}`;
    }
    if (/InvalidKeyMapError|missing a valid API key|API key/i.test(text)) {
      return `Google APIキー認証で失敗しました。生エラー：${raw}`;
    }
    if (/billing/i.test(text)) {
      return `Google Cloud側の請求先設定を確認してください。生エラー：${raw}`;
    }
    return `計算に失敗しました：${raw}`;
  }

  function setBusy(busy) {
    els.calculate.disabled = busy;
    els.recalculate.disabled = busy;
    els.calculate.textContent = busy ? '計算中…' : '現在の判断を計算';
    els.recalculate.textContent = busy ? '計算中…' : '再計算';
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      persistentStorageAvailable = false;
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (_) {
      persistentStorageAvailable = false;
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (_) {
      persistentStorageAvailable = false;
      return false;
    }
  }

  function showError(message) {
    els.formError.textContent = message;
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }

  function formatMoment(date, referenceDate = new Date()) {
    const sameDay = date.getFullYear() === referenceDate.getFullYear()
      && date.getMonth() === referenceDate.getMonth()
      && date.getDate() === referenceDate.getDate();
    return sameDay ? formatClock(date) : formatDateTime(date);
  }

  function formatDateTime(date) {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }

  function formatDuration(ms) {
    const totalMin = Math.max(0, Math.round(ms / 60_000));
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }

  function formatSignedDuration(ms) {
    const sign = ms >= 0 ? '+' : '−';
    return `${sign}${formatDuration(Math.abs(ms))}`;
  }

  function formatDistance(meters) {
    const value = Number(meters);
    if (!Number.isFinite(value)) return '—';
    if (value < 1000) return `${Math.round(value)} m`;
    return `${(value / 1000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })} km`;
  }

  function toLocalDateTimeInput(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
})();
