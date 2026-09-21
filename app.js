(() => {
  'use strict';

  const STORAGE_KEY_API = 'deadlineNavi.googleMapsApiKey';
  const STORAGE_KEY_NAVITIME = 'deadlineNavi.navitimeRapidApiKey';
  const STORAGE_KEY_FORM = 'deadlineNavi.formV05';
  const STORAGE_KEY_IC_CATALOG = 'deadlineNavi.icCatalogV070';
  const STORAGE_KEY_NAVITIME_BLOCK = 'deadlineNavi.navitimeBlockV070';
  const STORAGE_KEY_NATIONAL_IC_LEGACY = 'deadlineNavi.nationalIcV071';
  const STORAGE_KEY_NATIONAL_IC_META_LEGACY = 'deadlineNavi.nationalIcMetaV071';
  const STORAGE_KEY_API_USAGE = 'deadlineNavi.apiUsageV071';
  const CURRENT_APP_VERSION = '0.7.5';
  const LOCAL_IC_DATA_URL = './ic-data.min.json?v=075';
  const LOCAL_IC_MIN_COMPLETE_COUNT = 300;
  const IC_DISCOVERY_NETWORK_DISABLED = true;
  const NATIONAL_IC_PREFILTER_LIMIT = 12;
  const NATIONAL_IC_RECOVERY_LIMIT = 18;
  const NATIONAL_IC_CORRIDOR_M = 65_000;
  const V073_BUILTIN_FALLBACK_LIMIT = 8;
  const V073_MATRIX_ELEMENT_BUDGET = 99;
  const GOOGLE_FREE_CAP_PRO = 5_000;
  const GOOGLE_FREE_CAP_ENTERPRISE = 1_000;
  const GOOGLE_PRICE_PRO_PER_1000_USD = 10;
  const GOOGLE_PRICE_ENTERPRISE_PER_1000_USD = 15;
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
  const OSM_CELL_CACHE = new Map();
  const FARE_CACHE = new Map();
  const IC_CATALOG_MAX = 900;
  const OSM_DISCOVERY_RADIUS_KM = 14;
  const OSM_DISCOVERY_CONCURRENCY = 2;
  const V070_EXACT_LIMIT = 12;
  const V070_GOOGLE_TOLL_LIMIT = 4;
  const V070_NAVITIME_FARE_LIMIT = 2;
  const FARE_CACHE_TTL_MS = 15 * 60_000;
  const NAVITIME_IC_CALL_LIMIT = 3;

  const BUILTIN_KANSAI_TOKAI_IC_NAMES = [
    '京都東IC','京都南IC','巨椋池IC','久御山淀IC','大山崎IC','久御山IC','城陽IC','八幡京田辺IC',
    '瀬田西IC','瀬田東IC','草津田上IC','栗東IC','竜王IC','蒲生スマートIC','八日市IC','湖東三山スマートIC','彦根IC','米原IC',
    '甲賀土山IC','甲南IC','信楽IC','亀山IC','みえ川越IC','湾岸弥富IC','飛島IC','名港中央IC','東海IC','大府IC','豊明IC','豊田南IC','豊田東IC',
    '岡崎IC','岡崎東IC','豊川IC','新城IC','浜松いなさIC','三ヶ日IC','浜松西IC','浜松浜北IC','磐田IC','遠州森町スマートIC',
    '掛川IC','菊川IC','相良牧之原IC','島田金谷IC','吉田IC','焼津IC','静岡IC','新静岡IC','清水IC','新清水IC','新富士IC','富士IC'
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    apiKey: $('apiKey'),
    saveApiKey: $('saveApiKey'),
    apiStatus: $('apiStatus'),
    googleDiag: $('googleDiag'),
    googleDiagResult: $('googleDiagResult'),
    testLightweightUpdate: $('testLightweightUpdate'),
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
    voiceInterval: $('voiceInterval'),
    voiceTest: $('voiceTest'),
    voiceSelect: $('voiceSelect'),
    voiceStatus: $('voiceStatus'),
    monitorDetail: $('monitorDetail'),
    icCatalogStatus: $('icCatalogStatus'),
    apiUsageDiag: $('apiUsageDiag'),
    resetApiUsage: $('resetApiUsage'),
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
  let persistentIcCatalog = [];
  let navitimeBlockedUntil = 0;
  let navitimeBlockedReason = '';
  let nationalIcCatalog = [];
  let nationalIcMeta = null;
  let nationalIcLoadPromise = null;
  let apiUsageMonth = createEmptyApiUsage();
  let apiUsageSession = createEmptyApiUsage();
  let apiUsageCurrent = createEmptyApiUsage();
  let candidateDiagCurrent = createEmptyCandidateDiagnostic();
  let evaluatedCandidateKeysCurrent = new Set();
  let autoUpdateDiagCurrent = '未実行';
  const autoMonitor = {
    active: false,
    watchId: null,
    timerId: null,
    lastCalcAt: 0,
    lastCalcPosition: null,
    wakeLock: null,
    lastAnnouncementAt: 0,
    speechPrimed: false,
  };

  init();

  function init() {
    restoreState();
    restoreInfrastructureState();
    restoreApiUsage();
    setDefaultDeadlineIfEmpty();
    refreshApiStatus();
    refreshNavitimeStatus();

    els.saveApiKey.addEventListener('click', saveApiKey);
    els.googleDiag?.addEventListener('click', diagnoseGoogleApi);
    els.testLightweightUpdate?.addEventListener('click', testLightweightUpdateV075);
    els.resetApiUsage?.addEventListener('click', resetApiUsageCounters);
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
    els.voiceInterval?.addEventListener('change', () => {
      els.voiceInterval.value = String(clampNumber(Number(els.voiceInterval.value), 1, 60, 10));
      persistFormState();
    });
    els.voiceSelect?.addEventListener('change', () => { persistFormState(); populateSpeechVoiceOptions(); });
    setupSpeechVoices();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    [els.destination, els.arrivalDeadline, els.safetyMargin, els.debugNow, els.manualOrigin].forEach((el) => {
      el.addEventListener('change', persistFormState);
    });
    updateDebugControls();
    updateAutoUi();
    renderApiUsageDiagnostic();
    ensureNationalIcCatalogV072().catch((error) => {
      console.warn('Bundled IC catalog bootstrap failed:', error);
      renderIcCatalogStatus('全国ICカタログを読み込めません。内蔵候補で継続します。');
    });
    checkAppVersionV072().catch(() => {});
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
      if (Number.isFinite(saved.voiceInterval)) els.voiceInterval.value = clampNumber(saved.voiceInterval, 1, 60, 10);
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
      voiceInterval: clampNumber(Number(els.voiceInterval?.value), 1, 60, 10),
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
    clearNavitimeBlock();
    const persisted = safeStorageSet(STORAGE_KEY_NAVITIME, key);
    refreshNavitimeStatus();
    showError(persisted ? '' : 'Safariのローカルファイルでは永続保存できないため、このタブ内だけRapidAPIキーを保持します。');
  }

  function getNavitimeApiKey() {
    return runtimeNavitimeApiKey || els.navitimeApiKey.value.trim() || safeStorageGet(STORAGE_KEY_NAVITIME) || '';
  }

  function refreshNavitimeStatus() {
    const hasKey = Boolean(getNavitimeApiKey());
    if (navitimeBlockedUntil > Date.now()) {
      els.navitimeStatus.textContent = '利用上限・補助停止';
      els.navitimeStatus.className = 'badge badge-warn';
      return;
    }
    if (!hasKey) {
      els.navitimeStatus.textContent = '任意';
      els.navitimeStatus.className = 'badge badge-neutral';
      return;
    }
    els.navitimeStatus.textContent = persistentStorageAvailable ? '補助利用可' : '補助利用可（このタブ）';
    els.navitimeStatus.className = 'badge badge-good';
  }

  function restoreInfrastructureState() {
    try {
      const raw = JSON.parse(safeStorageGet(STORAGE_KEY_NAVITIME_BLOCK) || '{}');
      navitimeBlockedUntil = Number(raw.until || 0);
      navitimeBlockedReason = String(raw.reason || '');
      if (navitimeBlockedUntil <= Date.now()) clearNavitimeBlock();
    } catch (_) {
      navitimeBlockedUntil = 0;
      navitimeBlockedReason = '';
    }
    try {
      const rawCatalog = JSON.parse(safeStorageGet(STORAGE_KEY_IC_CATALOG) || '[]');
      persistentIcCatalog = Array.isArray(rawCatalog) ? rawCatalog.slice(0, IC_CATALOG_MAX) : [];
    } catch (_) {
      persistentIcCatalog = [];
    }
    try {
      const rawNational = JSON.parse(safeStorageGet(STORAGE_KEY_NATIONAL_IC_LEGACY) || '[]');
      nationalIcCatalog = Array.isArray(rawNational) ? rawNational : [];
      nationalIcMeta = JSON.parse(safeStorageGet(STORAGE_KEY_NATIONAL_IC_META_LEGACY) || 'null');
    } catch (_) {
      nationalIcCatalog = [];
      nationalIcMeta = null;
    }
    renderIcCatalogStatus();
  }

  function clearNavitimeBlock() {
    navitimeBlockedUntil = 0;
    navitimeBlockedReason = '';
    safeStorageRemove(STORAGE_KEY_NAVITIME_BLOCK);
  }

  function canUseNavitime() {
    return Boolean(getNavitimeApiKey()) && navitimeBlockedUntil <= Date.now();
  }

  function markNavitimeQuotaBlocked(reason = 'quota') {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 5, 0, 0);
    navitimeBlockedUntil = nextMonth.getTime();
    navitimeBlockedReason = reason;
    safeStorageSet(STORAGE_KEY_NAVITIME_BLOCK, JSON.stringify({ until: navitimeBlockedUntil, reason }));
    refreshNavitimeStatus();
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
      showError('音声案内では実時間を使います。デバッグ用の仮想時刻をOFFにしてください。');
      return;
    }
    if (!getApiKey()) {
      showError('先にGoogle Maps APIキーを設定してください。');
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

    // The start tap is the one reliable user gesture we have on iPhone.
    // Prime SpeechSynthesis synchronously here, before the first await/GPS/API callback.
    // Without this, iOS Safari/PWA can silently suppress later automatic speech.
    if (els.voiceEnabled) els.voiceEnabled.checked = true;
    persistFormState();
    autoMonitor.active = true;
    autoMonitor.lastCalcAt = 0;
    autoMonitor.lastCalcPosition = null;
    autoMonitor.lastAnnouncementAt = 0;
    lastDecisionSnapshot = null;
    primeSpeechFromUserGesture();
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
          ? '位置情報の利用が許可されていません。音声案内を終了しました。'
          : '現在地を継続取得できません。音声案内を終了しました。';
        showError(msg);
        stopAutoMonitor();
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 },
    );

    autoMonitor.timerId = window.setInterval(() => {
      maybeAutoRecalculate('timer');
      maybePeriodicAnnouncement();
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
    autoMonitor.speechPrimed = false;
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
      els.monitorDetail.textContent = '開始すると現在地を追跡し、必要なタイミングで経路を再計算します。定期アナウンスの間隔は設定から変更できます。';
      return;
    }

    const policy = currentAutoPolicy();
    const elapsed = autoMonitor.lastCalcAt ? Date.now() - autoMonitor.lastCalcAt : 0;
    const remainMs = Math.max(0, policy.intervalMs - elapsed);
    const mode = policy.level === 'critical' ? '切替直前' : policy.level === 'approach' ? '切替接近' : '通常';
    els.autoStatus.textContent = message || `音声案内中・${mode}`;
    els.monitorDetail.textContent = autoMonitor.lastCalcAt
      ? `経路は必要なタイミングで自動更新します。定期アナウンスは${getVoiceIntervalMinutes()}分ごとです。重要な変化は待たずに案内します。`
      : '最初のGPS取得後に自動計算します。';
  }

  function getVoiceIntervalMinutes() {
    return clampNumber(Number(els.voiceInterval?.value), 1, 60, 10);
  }

  function maybePeriodicAnnouncement() {
    if (!autoMonitor.active || !els.voiceEnabled?.checked || !lastDecisionSnapshot) return;
    if (lastDecisionSnapshot.mode === 'error' || lastDecisionSnapshot.mode === 'incomplete') return;
    if (!autoMonitor.speechPrimed) return;
    const intervalMs = getVoiceIntervalMinutes() * 60_000;
    const now = Date.now();
    if (autoMonitor.lastAnnouncementAt && now - autoMonitor.lastAnnouncementAt < intervalMs) return;
    if (window.speechSynthesis?.speaking) return;
    const text = buildPeriodicVoiceMessage(lastDecisionSnapshot);
    if (text) speakJapanese(text, { priority: 'periodic' });
  }

  function buildPeriodicVoiceMessage(snapshot) {
    if (!snapshot) return '';
    if (snapshot.mode === 'no_toll') {
      const eta = snapshot.localEta instanceof Date ? formatTimeForSpeech(snapshot.localEta) : '';
      const slackMin = Number.isFinite(snapshot.localSlackMs)
        ? Math.max(0, Math.floor(snapshot.localSlackMs / 60_000))
        : null;
      const etaText = eta ? `下道での到着予想は${eta}ごろです。` : '';
      const slackText = slackMin !== null ? `到着条件まで約${slackMin}分の余裕があります。` : '';
      return `まだ下道で大丈夫です。${etaText}${slackText}`;
    }
    if (snapshot.mode === 'impossible') {
      return '現在の交通状況では、Google推奨ルートでも到着期限を超える見込みです。';
    }
    if (snapshot.mode === 'candidate' && snapshot.candidate) {
      return buildCandidateVoiceMessage(snapshot.candidate, 'periodic');
    }
    return '';
  }

  function finalizeCalculationSnapshot(snapshot, source) {
    if (!snapshot) return;
    // A transient background failure must not erase the last verified driving
    // decision. Keeping the stable snapshot also prevents a recovery refresh
    // from being announced as if the recommendation had suddenly changed.
    if (source === 'auto' && (snapshot.mode === 'error' || snapshot.mode === 'incomplete')) return;
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
    const prefix = (context === 'initial' || context === 'periodic')
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
    return `引き続き、現在のルートをお進みください。カーナビを${candidate.name}に変更する目安は、あと約${remainingMin}分、${changeTime}ごろです。`;
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

  function primeSpeechFromUserGesture() {
    if (!('speechSynthesis' in window)) {
      if (els.voiceStatus) els.voiceStatus.textContent = 'このブラウザでは音声読み上げを利用できません。';
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('音声案内を開始します。');
      utterance.lang = 'ja-JP';
      utterance.rate = 0.90;
      utterance.pitch = 1.03;
      utterance.volume = 1.0;
      const voice = chooseJapaneseVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        autoMonitor.speechPrimed = true;
        autoMonitor.lastAnnouncementAt = Date.now();
        if (els.voiceStatus) els.voiceStatus.textContent = voice
          ? `使用中：${voice.name}`
          : '音声案内を利用できます。';
      };
      utterance.onerror = (event) => {
        autoMonitor.speechPrimed = false;
        const reason = event?.error || 'unknown';
        if (els.voiceStatus) els.voiceStatus.textContent = `音声を開始できませんでした（${reason}）。「音声案内を開始」をもう一度タップしてください。`;
      };
      window.speechSynthesis.speak(utterance);
      // Mark as primed optimistically; onerror will revert this. Some Safari builds
      // do not reliably fire onstart even when speech is audible.
      autoMonitor.speechPrimed = true;
      autoMonitor.lastAnnouncementAt = Date.now();
      return true;
    } catch (error) {
      autoMonitor.speechPrimed = false;
      console.warn('speechSynthesis priming failed:', error);
      return false;
    }
  }

  function speakJapanese(text, options = {}) {
    if (!text || !('speechSynthesis' in window)) {
      showError('このブラウザでは音声読み上げを利用できません。');
      return false;
    }
    try {
      if (options.priority !== 'periodic') window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.90;
      utterance.pitch = 1.03;
      utterance.volume = 1.0;
      const voice = chooseJapaneseVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (autoMonitor.active) autoMonitor.lastAnnouncementAt = Date.now();
      };
      utterance.onerror = (event) => {
        const reason = event?.error || 'unknown';
        console.warn('speechSynthesis utterance error:', reason, event);
        if (reason === 'not-allowed' || reason === 'audio-busy') {
          autoMonitor.speechPrimed = false;
          if (els.voiceStatus) els.voiceStatus.textContent = 'iPhoneが自動音声を停止しました。「音声案内を終了」→「音声案内を開始」の順でタップしてください。';
        }
      };
      window.speechSynthesis.speak(utterance);
      if (autoMonitor.active) autoMonitor.lastAnnouncementAt = Date.now();
      return true;
    } catch (error) {
      console.warn('speechSynthesis failed:', error);
      return false;
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

  function createEmptyCandidateDiagnostic() {
    return {
      initial: null,
      recovery: null,
      fallback: null,
    };
  }

  function recordCandidateDiagnostic(phase, stats) {
    candidateDiagCurrent[phase] = stats ? { ...stats } : null;
    renderApiUsageDiagnostic();
  }

  function formatCandidateDiagnostic() {
    const rows = ['候補絞り込み'];
    const labels = { initial: '通常', recovery: '回復', fallback: '最終' };
    let any = false;
    for (const phase of ['initial', 'recovery', 'fallback']) {
      const s = candidateDiagCurrent[phase];
      if (!s) continue;
      any = true;
      rows.push(`  ${labels[phase]}: 発見 ${s.discovered} → 評価済除外 ${s.reused || 0} → Matrix新規 ${s.sent} → 概算safe ${s.approxSafe} → 精査safe ${s.safe}`);
    }
    if (!any) rows.push('  まだ候補評価を実行していません');
    return rows.join('\n');
  }

  function createEmptyApiUsage() {
    return {
      googleRoutesPro: 0,
      googleRoutesEnterprise: 0,
      googleMatrixRequests: 0,
      googleMatrixElements: 0,
      navitimeIc: 0,
      navitimeRoute: 0,
      overpass: 0,
      catalogDownloads: 0,
    };
  }

  function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function restoreApiUsage() {
    try {
      const raw = JSON.parse(safeStorageGet(STORAGE_KEY_API_USAGE) || '{}');
      apiUsageMonth = raw.month === currentMonthKey() && raw.usage ? { ...createEmptyApiUsage(), ...raw.usage } : createEmptyApiUsage();
    } catch (_) {
      apiUsageMonth = createEmptyApiUsage();
    }
  }

  function saveApiUsage() {
    safeStorageSet(STORAGE_KEY_API_USAGE, JSON.stringify({ month: currentMonthKey(), usage: apiUsageMonth }));
  }

  function beginApiUsageCalculation() {
    apiUsageCurrent = createEmptyApiUsage();
    candidateDiagCurrent = createEmptyCandidateDiagnostic();
    evaluatedCandidateKeysCurrent = new Set();
    autoUpdateDiagCurrent = '未実行';
    renderApiUsageDiagnostic();
  }

  function incrementApiUsage(key, amount = 1) {
    if (!Object.prototype.hasOwnProperty.call(apiUsageMonth, key)) return;
    const n = Number(amount) || 0;
    apiUsageMonth[key] += n;
    apiUsageSession[key] += n;
    apiUsageCurrent[key] += n;
    saveApiUsage();
    renderApiUsageDiagnostic();
  }

  function resetApiUsageCounters() {
    apiUsageMonth = createEmptyApiUsage();
    apiUsageSession = createEmptyApiUsage();
    apiUsageCurrent = createEmptyApiUsage();
    saveApiUsage();
    renderApiUsageDiagnostic();
  }

  function formatUsageBlock(label, u) {
    return [
      label,
      `  Google Routes Pro: ${u.googleRoutesPro} req`,
      `  Google Routes Enterprise (TOLLS): ${u.googleRoutesEnterprise} req`,
      `  Route Matrix Pro: ${u.googleMatrixElements} elements / ${u.googleMatrixRequests} req`,
      `  NAVITIME IC: ${u.navitimeIc} req`,
      `  NAVITIME Route: ${u.navitimeRoute} req`,
      `  Overpass: ${u.overpass} req`,
      `  IC catalog download: ${u.catalogDownloads}`,
    ].join('\n');
  }

  function estimateGoogleListPriceUsd(u) {
    // Reference list-price estimate only. It deliberately does not try to
    // reproduce Cloud Billing credits, negotiated pricing, tax, or FX.
    const proBillable = Math.max(0, Number(u.googleRoutesPro || 0) - GOOGLE_FREE_CAP_PRO);
    const matrixBillable = Math.max(0, Number(u.googleMatrixElements || 0) - GOOGLE_FREE_CAP_PRO);
    const enterpriseBillable = Math.max(0, Number(u.googleRoutesEnterprise || 0) - GOOGLE_FREE_CAP_ENTERPRISE);
    return (proBillable + matrixBillable) * GOOGLE_PRICE_PRO_PER_1000_USD / 1000
      + enterpriseBillable * GOOGLE_PRICE_ENTERPRISE_PER_1000_USD / 1000;
  }

  function renderApiUsageDiagnostic() {
    if (!els.apiUsageDiag) return;
    const catalogLine = nationalIcCatalog.length
      ? `全国ICカタログ: ${nationalIcCatalog.length.toLocaleString('ja-JP')}件（${nationalIcMeta?.bundled ? 'アプリ同梱' : 'v0.7.1端末キャッシュ'}）`
      : nationalIcMeta?.complete === false
        ? '全国ICカタログ: 同梱データを利用できません（読み込み・検証失敗）'
        : '全国ICカタログ: 未読込';
    els.apiUsageDiag.textContent = [
      formatUsageBlock('今回の計算', apiUsageCurrent),
      `走行中更新: ${autoUpdateDiagCurrent}`,
      formatCandidateDiagnostic(),
      '',
      formatUsageBlock('このブラウザ・今月', apiUsageMonth),
      `  無料枠目安: Routes Pro ${apiUsageMonth.googleRoutesPro}/${GOOGLE_FREE_CAP_PRO}, Matrix Pro ${apiUsageMonth.googleMatrixElements}/${GOOGLE_FREE_CAP_PRO}, Enterprise ${apiUsageMonth.googleRoutesEnterprise}/${GOOGLE_FREE_CAP_ENTERPRISE}`,
      `  参考従量額: US$${estimateGoogleListPriceUsd(apiUsageMonth).toFixed(2)}（このブラウザ分を現行公開単価・無料枠で単純換算）`,
      '',
      catalogLine,
      '※ Cloud Billingの確定額ではありません。プロジェクト全体の他端末利用、クレジット、税、為替、料金改定等はGoogle Cloud Consoleで確認してください。',
    ].join('\n');
  }

  async function trackedComputeRoutes(Route, request) {
    const enterprise = Array.isArray(request?.extraComputations) && request.extraComputations.includes('TOLLS');
    incrementApiUsage(enterprise ? 'googleRoutesEnterprise' : 'googleRoutesPro', 1);
    return Route.computeRoutes(request);
  }

  async function trackedComputeRouteMatrix(RouteMatrix, request) {
    const origins = Array.isArray(request?.origins) ? request.origins.length : 0;
    const destinations = Array.isArray(request?.destinations) ? request.destinations.length : 0;
    const elements = origins * destinations;
    if (calculationInFlight && apiUsageCurrent.googleMatrixElements + elements > V073_MATRIX_ELEMENT_BUDGET) {
      throw new Error(`Route Matrixの1計算上限 ${V073_MATRIX_ELEMENT_BUDGET} 要素を超えるため、この探索を停止しました。`);
    }
    incrementApiUsage('googleMatrixRequests', 1);
    incrementApiUsage('googleMatrixElements', elements);
    return RouteMatrix.computeRouteMatrix(request);
  }

  function renderIcCatalogStatus(message = '') {
    if (!els.icCatalogStatus) return;
    if (message) {
      els.icCatalogStatus.textContent = message;
      return;
    }
    if (nationalIcCatalog.length) {
      const source = nationalIcMeta?.sourceLabel || '全国ICカタログ';
      els.icCatalogStatus.textContent = `${source}: ${nationalIcCatalog.length.toLocaleString('ja-JP')}件（${nationalIcMeta?.bundled ? 'アプリ同梱' : '端末キャッシュ移行'}）`;
    } else {
      els.icCatalogStatus.textContent = '全国ICカタログを読み込み中…';
    }
  }

  function normalizeNationalIcName(name, type) {
    const raw = String(name || '').trim();
    if (!raw) return '';
    if (/IC$|SIC$|JCT\/IC$|JCT$/i.test(raw)) return raw;
    return type === '2' ? `${raw}SIC` : `${raw}IC`;
  }

  function ensureNationalIcCatalogV072() {
    if (!nationalIcLoadPromise) nationalIcLoadPromise = loadNationalIcCatalogV072();
    return nationalIcLoadPromise;
  }

  async function loadNationalIcCatalogV072() {
    if (nationalIcCatalog.length >= LOCAL_IC_MIN_COMPLETE_COUNT && nationalIcMeta?.bundled) {
      renderIcCatalogStatus();
      return nationalIcCatalog;
    }

    renderIcCatalogStatus('全国ICカタログをアプリ内データから読み込み中…');
    let localData = null;
    try {
      // Same-origin static asset bundled with Deadline Navi. This is deliberately
      // not counted as an external API request.
      const response = await fetch(LOCAL_IC_DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`local IC data HTTP ${response.status}`);
      localData = await response.json();
    } catch (error) {
      console.warn('Local IC data load failed:', error);
    }

    const items = Array.isArray(localData?.items) ? localData.items : [];
    const clean = [];
    const seen = new Set();
    for (const item of items) {
      const lat = Number(item?.lat);
      const lng = Number(item?.lng);
      const name = String(item?.name || '').trim();
      if (!name || typeof item?.lat !== 'number' || typeof item?.lng !== 'number'
        || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      const key = normalizeIcKey(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      clean.push({
        id: String(item?.id || `local-${key}`),
        name,
        lat,
        lng,
        smart: Boolean(item?.smart),
      });
    }

    if (localData?.meta?.complete === true && localData.meta.count === items.length
      && clean.length === items.length && clean.length >= LOCAL_IC_MIN_COMPLETE_COUNT) {
      nationalIcCatalog = clean;
      nationalIcMeta = {
        sourceLabel: '全国ICカタログ',
        source: String(localData?.meta?.source || 'MLIT N06 derived / HighwayOrderedDS'),
        generatedAt: localData?.meta?.generatedAt || null,
        count: clean.length,
        complete: true,
        bundled: true,
      };
      renderIcCatalogStatus();
      renderApiUsageDiagnostic();
      return nationalIcCatalog;
    }

    // One-version migration path: users who already ran v0.7.1 may have the
    // complete catalog in localStorage. Use it locally, but never reach out to
    // GitHub/Overpass/NAVITIME to discover ICs at runtime.
    if (nationalIcCatalog.length >= LOCAL_IC_MIN_COMPLETE_COUNT) {
      nationalIcMeta = { ...(nationalIcMeta || {}), sourceLabel: '全国ICカタログ', bundled: false };
      renderIcCatalogStatus();
      renderApiUsageDiagnostic();
      return nationalIcCatalog;
    }

    nationalIcCatalog = [];
    nationalIcMeta = {
      sourceLabel: '全国ICカタログ',
      source: String(localData?.meta?.source || 'bundled seed'),
      generatedAt: localData?.meta?.generatedAt || null,
      count: 0,
      bundled: false,
      complete: false,
    };
    renderIcCatalogStatus('同梱ICカタログの読み込み・検証に失敗しました。内蔵候補だけで継続します。');
    renderApiUsageDiagnostic();
    return nationalIcCatalog;
  }

  function nationalIcCandidatesNearRouteV071(routePath, discoveryPoints = [], maxDistanceMeters = NATIONAL_IC_CORRIDOR_M, limit = NATIONAL_IC_PREFILTER_LIMIT) {
    if (!routePath.length || !nationalIcCatalog.length) return [];
    const mapped = [];
    for (const stored of nationalIcCatalog) {
      const point = { lat: Number(stored.lat), lng: Number(stored.lng) };
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
      const projection = projectPointToRoute(point, routePath);
      if (!Number.isFinite(projection.corridorDistanceMeters) || projection.corridorDistanceMeters > maxDistanceMeters) continue;
      let anchorDistanceMeters = Infinity;
      for (const anchor of discoveryPoints) anchorDistanceMeters = Math.min(anchorDistanceMeters, haversineMeters(point, anchor));
      const candidate = {
        id: stored.id || `national-${normalizeIcKey(stored.name)}`,
        name: stored.name,
        road: stored.smart ? '全国ICカタログ / スマートIC' : '全国ICカタログ',
        waypoint: point,
        mapWaypoint: point,
        source: 'NATIONAL',
        ...projection,
        anchorDistanceMeters,
      };
      candidate.localRankScore = (Number.isFinite(anchorDistanceMeters) ? anchorDistanceMeters * 0.75 : 0)
        + projection.corridorDistanceMeters * 1.25;
      mapped.push(candidate);
    }
    const byAnchor = mapped.slice().sort((a, b) => a.localRankScore - b.localRankScore).slice(0, Math.max(10, Math.ceil(limit * 0.7)));
    const byCorridor = mapped.slice().sort((a, b) => a.corridorDistanceMeters - b.corridorDistanceMeters).slice(0, Math.max(5, Math.floor(limit * 0.3)));
    return dedupeIcCandidatesV070([...byAnchor, ...byCorridor]).slice(0, limit);
  }

  async function checkAppVersionV072() {
    try {
      const response = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const remote = await response.json();
      if (remote?.version && remote.version !== CURRENT_APP_VERSION) {
        const url = new URL(window.location.href);
        url.searchParams.set('v', String(remote.version).replace(/\./g, ''));
        window.location.replace(url.toString());
      }
    } catch (_) {
      // Offline use remains available; update check is intentionally best-effort.
    }
  }

  function shouldUseLightweightCandidateV075(source, destination, snapshot, candidate, candidateDestination) {
    return source === 'auto'
      && snapshot?.mode === 'candidate'
      && Boolean(candidate?.waypoint)
      && candidateDestination === destination;
  }

  async function evaluateRetainedCandidateV075({
    Route,
    origin,
    destination,
    now,
    practicalDeadline,
    candidate,
  }) {
    try {
      const localRoute = await computeLocalLeg(Route, origin, candidate.waypoint, now);
      const localDurationMs = Number(localRoute?.durationMillis || 0);
      if (!localDurationMs) return { safe: false, reason: '推奨ICまでの下道経路なし' };

      const icArrival = new Date(now.getTime() + localDurationMs);
      const fastRoute = await computeFastLeg(Route, candidate.waypoint, destination, icArrival);
      const fastDurationMs = Number(fastRoute?.durationMillis || 0);
      if (!fastDurationMs) return { safe: false, reason: '推奨ICから目的地への経路なし' };

      const totalDurationMs = localDurationMs + fastDurationMs;
      const destinationEta = new Date(now.getTime() + totalDurationMs);
      const switchDeadline = new Date(practicalDeadline.getTime() - fastDurationMs);
      const safe = destinationEta <= practicalDeadline;
      if (!safe) return { safe: false, reason: '推奨ICでは到着条件を満たさない' };

      const previousGuidance = candidate.navGuidance;
      const navGuidance = previousGuidance
        ? refreshNavGuidance(previousGuidance, now)
        : fallbackNavGuidance({ ...candidate, icArrival, switchDeadline }, now);

      return {
        ...candidate,
        failed: false,
        localDurationMs,
        localDistanceMeters: Number(localRoute?.distanceMeters || candidate.localDistanceMeters || 0),
        fastDurationMs,
        totalDurationMs,
        icArrival,
        destinationEta,
        switchDeadline,
        endpoints: routeEndpoints(fastRoute) || candidate.endpoints,
        safe: true,
        navGuidance,
        lightweightCheckedAt: new Date(now),
      };
    } catch (error) {
      console.warn('Lightweight retained-candidate check failed:', error);
      return { safe: false, reason: '軽量確認エラー' };
    }
  }

  async function testLightweightUpdateV075() {
    showError('');
    if (calculationInFlight) return;
    const destination = els.destination.value.trim();
    if (!shouldUseLightweightCandidateV075(
      'auto',
      destination,
      lastDecisionSnapshot,
      retainedCandidate,
      retainedCandidateDestination,
    )) {
      showError('先に通常計算で高速入口候補を確定してください。');
      return;
    }
    await calculate({ source: 'auto', suppressScroll: true, trigger: 'diagnostic-lightweight' });
  }

  async function calculate(options = {}) {
    const source = options.source || 'manual';
    const suppressScroll = Boolean(options.suppressScroll || source === 'auto');
    if (calculationInFlight) return null;
    calculationInFlight = true;
    beginApiUsageCalculation();

    showError('');
    persistFormState();
    if (source === 'manual') resetCandidateUi();

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
    const practicalDeadline = new Date(deadline.getTime() - safetyMarginMin * 60_000);

    if (!apiKey) { calculationInFlight = false; showError('先にGoogle Maps APIキーを設定してください。'); return null; }
    if (!origin) { calculationInFlight = false; showError('「現在地を取得」するか、出発地を手入力してください。'); return null; }
    if (!destination) { calculationInFlight = false; showError('目的地を入力してください。'); return null; }
    if (Number.isNaN(deadline.getTime())) { calculationInFlight = false; showError('到着希望日時を入力してください。'); return null; }
    if (deadline <= now) { calculationInFlight = false; showError('到着希望日時は、計算に使う現在時刻より後に設定してください。'); return null; }

    setBusy(true);
    let snapshot = null;

    try {
      const { Route, RouteMatrix } = await loadGoogleRoutes(apiKey);

      if (shouldUseLightweightCandidateV075(
        source,
        destination,
        lastDecisionSnapshot,
        retainedCandidate,
        retainedCandidateDestination,
      )) {
        const lightweight = await evaluateRetainedCandidateV075({
          Route,
          origin,
          destination,
          now,
          practicalDeadline,
          candidate: retainedCandidate,
        });
        if (lightweight?.safe) {
          autoUpdateDiagCurrent = `軽量確認成功: ${lightweight.name} を継続（全探索省略）`;
          renderApiUsageDiagnostic();
          els.candidateCount.textContent = '軽量確認 1件';
          els.candidateStatus.textContent = `${lightweight.name} が引き続き到着条件を満たすことを確認しました。全国候補の再探索は省略しました。`;
          renderSwitchSummary(lightweight, now, practicalDeadline);
          const selectedKey = `IC:${lightweight.navitimeIcId || lightweight.id || lightweight.name}`;
          const snapshot = {
            mode: 'candidate',
            key: selectedKey,
            now,
            practicalDeadline,
            localEta: lastDecisionSnapshot?.localEta || null,
            localSlackMs: lastDecisionSnapshot?.localSlackMs,
            candidate: lightweight,
            lightweight: true,
          };
          finalizeCalculationSnapshot(snapshot, source);
          return snapshot;
        }
        autoUpdateDiagCurrent = lightweight?.reason
          ? `軽量確認で再探索が必要（${lightweight.reason}）`
          : '軽量確認で再探索が必要';
        renderApiUsageDiagnostic();
      } else if (source === 'auto') {
        autoUpdateDiagCurrent = '推奨IC未確定のためフル探索';
        renderApiUsageDiagnostic();
      }
      if (source !== 'auto') autoUpdateDiagCurrent = 'フル探索（手動計算）';
      renderApiUsageDiagnostic();

      const baseRequest = {
        origin,
        destination,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        language: 'ja',
      };

      const normalRequest = applyFutureDepartureTime({
        ...baseRequest,
        fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'legs', 'path'],
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
        trackedComputeRoutes(Route, normalRequest),
        trackedComputeRoutes(Route, localRequest),
      ]);

      const normalRoute = normalResult.routes?.[0];
      const localRoute = localResult.routes?.[0];
      if (!normalRoute || !localRoute) throw new Error('利用可能な経路が見つかりませんでした。');

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
        renderSwitchUnavailable('期限内に到着できる経路を確認できません', '交通状況を確認してください');
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

      let candidateResult = null;
      try {
        candidateResult = await evaluateCandidatesV070({
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
          source,
        });
      } catch (candidateError) {
        console.error('Candidate evaluation failed:', candidateError);
        els.candidateStatus.textContent = `候補評価のみ失敗しました：${String(candidateError?.message || candidateError)}`;
        if (source === 'auto') {
          if (els.monitorDetail) els.monitorDetail.textContent = '候補更新に失敗しました。現在の表示を維持し、次回更新で再試行します。';
        } else {
          showError('高速切替候補の計算に失敗しました。通信状況を確認して、再計算してください。');
        }
        snapshot = { mode: 'error', key: 'CANDIDATE_ERROR', now, practicalDeadline, localEta, localSlackMs, candidate: lastDecisionSnapshot?.candidate || null };
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
      if (source === 'auto') {
        if (els.monitorDetail) els.monitorDetail.textContent = '自動更新に失敗しました。現在の表示を維持し、次回更新で再試行します。';
      } else {
        showError(normalizeApiError(error));
      }
      snapshot = { mode: 'error', key: 'CALCULATION_ERROR', now, candidate: lastDecisionSnapshot?.candidate || null };
      finalizeCalculationSnapshot(snapshot, source);
      return snapshot;
    } finally {
      setBusy(false);
      calculationInFlight = false;
      if (autoMonitor.active) updateAutoUi();
    }
  }

  async function evaluateCandidatesV070({
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
    source,
  }) {
    const startedAt = performance.now();
    const localPath = normalizeRoutePath(localRoute?.path);
    const normalPath = normalizeRoutePath(normalRoute?.path);
    if (localPath.length < 2) throw new Error('下道ルートの形状を取得できませんでした。');

    const cumulative = cumulativePathDistances(localPath);
    const routeTotalMeters = cumulative.at(-1) || Number(localRoute.distanceMeters || 0);
    const checkpointResult = await evaluateSyntheticCheckpointBoundary({
      Route,
      RouteMatrix,
      origin,
      destination,
      now,
      practicalDeadline,
      routePath: localPath,
      cumulative,
      localDirectDurationMs,
      normalDirectDurationMs,
    });

    const discoveryPoints = v070DiscoveryPoints(localPath, cumulative, checkpointResult.boundary, routeTotalMeters);
    let pool = await discoverCandidatePoolV070({
      routePath: localPath,
      discoveryPoints,
      navitimeApiKey,
      includeBuiltins: true,
      destination,
    });

    let evaluated = await evaluateCandidatePoolV070({
      Route,
      RouteMatrix,
      origin,
      destination,
      now,
      practicalDeadline,
      localDirectDurationMs,
      normalDirectDurationMs,
      candidates: pool,
      matrixCandidateLimit: NATIONAL_IC_PREFILTER_LIMIT,
    });
    recordCandidateDiagnostic('initial', evaluated.stats);

    // Invariant: if Google's recommended route is within the practical deadline,
    // we must not conclude that there is no feasible highway entrance merely
    // because the local-road corridor discovery missed a sideways/backtracking IC.
    if (!evaluated.safe.length && normalPath.length >= 2) {
      const normalCumulative = cumulativePathDistances(normalPath);
      const horizon = Math.min(normalCumulative.at(-1) || 0, RECOVERY_ROUTE_HORIZON_M);
      const recoveryPoints = [];
      const targets = [0, 20_000, 45_000, 75_000, 110_000, horizon];
      for (const target of targets) {
        const point = interpolatePathAtDistance(normalPath, normalCumulative, Math.min(horizon, target));
        if (point) recoveryPoints.push(point);
      }
      const recoveryPool = await discoverCandidatePoolV070({
        routePath: normalPath,
        discoveryPoints: recoveryPoints,
        navitimeApiKey,
        includeBuiltins: true,
        destination,
        recovery: true,
      });
      pool = dedupeIcCandidatesV070([...pool, ...recoveryPool]);
      evaluated = await evaluateCandidatePoolV070({
        Route,
        RouteMatrix,
        origin,
        destination,
        now,
        practicalDeadline,
        localDirectDurationMs,
        normalDirectDurationMs,
        candidates: pool,
        matrixCandidateLimit: NATIONAL_IC_RECOVERY_LIMIT,
      });
      recordCandidateDiagnostic('recovery', evaluated.stats);
    }

    if (!evaluated.safe.length) {
      const builtinFallback = dedupeIcCandidatesV070([
        ...builtinCandidatesForRouteV070(localPath),
        ...builtinCandidatesForRouteV070(normalPath),
      ]);
      if (builtinFallback.length) {
        pool = dedupeIcCandidatesV070([...pool, ...builtinFallback]);
        evaluated = await evaluateCandidatePoolV070({
          Route,
          RouteMatrix,
          origin,
          destination,
          now,
          practicalDeadline,
          localDirectDurationMs,
          normalDirectDurationMs,
          candidates: pool,
          matrixCandidateLimit: V073_BUILTIN_FALLBACK_LIMIT,
        });
        recordCandidateDiagnostic('fallback', evaluated.stats);
      }
    }

    if (!evaluated.safe.length) {
      renderCandidateList([], null, now, practicalDeadline);
      if (retainedCandidate && retainedCandidateDestination === destination) {
        renderSwitchUnavailable(`前回候補 ${retainedCandidate.name}`, '現在の交通状況で再確認できていません');
      } else {
        renderSwitchUnavailable('高速入口を再確認中', 'Google推奨ルートは期限内です');
      }
      els.candidateStatus.textContent = 'Google推奨ルートは期限内ですが、高速入口候補を確定できませんでした。次回更新で再確認します。';
      return { selected: null, display: evaluated.exact, pricedSafe: [], elapsedSec: (performance.now() - startedAt) / 1000 };
    }

    const priced = await priceFinalistsV070({
      Route,
      destination,
      practicalDeadline,
      candidates: evaluated.safe,
      navitimeApiKey,
    });

    let selected = priced.selected;
    if (selected) selected = await refineSwitchDeadline(Route, selected, destination, practicalDeadline, now);

    const displayMap = new Map(evaluated.exact.filter((item) => item && !item.failed).map((item) => [item.id, item]));
    priced.priced.forEach((item) => displayMap.set(item.id, item));
    if (selected) displayMap.set(selected.id, selected);
    const display = [...displayMap.values()].sort((a, b) => {
      if (a.safe !== b.safe) return a.safe ? -1 : 1;
      const ap = Number.isFinite(a.toll?.yen);
      const bp = Number.isFinite(b.toll?.yen);
      if (ap && bp) return (a.toll.yen - b.toll.yen) || (b.localDurationMs - a.localDurationMs);
      if (ap !== bp) return ap ? -1 : 1;
      return b.localDurationMs - a.localDurationMs;
    });

    renderCandidateList(display, selected?.id || null, now, practicalDeadline);
    if (selected) renderSwitchSummary(selected, now, practicalDeadline);
    else renderSwitchUnavailable('高速入口を再確認中', '到着条件を満たす候補はあります');

    const elapsedSec = (performance.now() - startedAt) / 1000;
    els.candidateStatus.textContent = selected
      ? '到着条件を満たす入口を比較しました。料金が取得できない場合も、到着可能性を優先して案内を継続します。'
      : '到着可能な入口を再確認しています。';
    return { selected, display, pricedSafe: priced.priced.filter((x) => Number.isFinite(x.toll?.yen)), elapsedSec };
  }

  function v070DiscoveryPoints(routePath, cumulative, boundary, routeTotalMeters) {
    const points = [];
    const add = (point) => {
      const p = readCoordinate(point);
      if (!p) return;
      if (!points.some((existing) => haversineMeters(existing, p) < 8_000)) points.push(p);
    };
    add(boundary?.safe?.waypoint);
    add(boundary?.unsafe?.waypoint);
    const progress = Number(boundary?.progress ?? boundary?.safe?.routeProgressMeters ?? routeTotalMeters * 0.35);
    for (const offset of [-30_000, -12_000, 0, 18_000, 40_000]) {
      add(interpolatePathAtDistance(routePath, cumulative, Math.max(0, Math.min(routeTotalMeters, progress + offset))));
    }
    return points.slice(0, 6);
  }

  async function discoverCandidatePoolV070({ routePath, discoveryPoints, navitimeApiKey, includeBuiltins, destination, recovery = false }) {
    await ensureNationalIcCatalogV072();
    const national = nationalIcCandidatesNearRouteV071(
      routePath,
      discoveryPoints,
      recovery ? 90_000 : NATIONAL_IC_CORRIDOR_M,
      recovery ? NATIONAL_IC_RECOVERY_LIMIT : NATIONAL_IC_PREFILTER_LIMIT,
    );
    const cached = cachedIcCandidatesNearRouteV070(routePath, 45_000);
    const retained = retainedCandidateDestination === destination && retainedCandidate
      ? [{
        id: retainedCandidate.id || `retained-${normalizeIcKey(retainedCandidate.name)}`,
        navitimeIcId: retainedCandidate.navitimeIcId || null,
        name: retainedCandidate.name,
        road: retainedCandidate.road || '前回の推奨入口',
        waypoint: retainedCandidate.waypoint,
        mapWaypoint: candidateProjectionPointV070(retainedCandidate),
        source: 'RETAINED',
      }]
      : [];
    let pool = dedupeIcCandidatesV070([...retained, ...national, ...cached]);

    // v0.7.2 invariant: IC discovery is local-only.  Do not query public
    // Overpass or NAVITIME /ic here. NAVITIME remains available only for the
    // separate fare fallback path.

    // A named Kansai–Tokai catalog is a last-resort safety net, not the normal
    // discovery path. Keeping it out of routine recalculations avoids dozens of
    // unnecessary Route Matrix elements on every refresh.
    if (includeBuiltins && pool.length < 4) {
      pool = dedupeIcCandidatesV070([...pool, ...builtinCandidatesForRouteV070(routePath)]);
    }

    return prefilterDiscoveredCandidatesV071(pool, recovery ? NATIONAL_IC_RECOVERY_LIMIT : NATIONAL_IC_PREFILTER_LIMIT);
  }

  function prefilterDiscoveredCandidatesV071(candidates, limit) {
    const rank = { RETAINED: 0, NATIONAL: 1, CACHE: 2, BUILTIN: 3, NAVITIME_IC: 8, OSM: 9 };
    const mapped = dedupeIcCandidatesV070(candidates).slice();
    mapped.sort((a, b) => {
      const ar = rank[a.source] ?? 9;
      const br = rank[b.source] ?? 9;
      if (a.source === 'RETAINED' && b.source !== 'RETAINED') return -1;
      if (b.source === 'RETAINED' && a.source !== 'RETAINED') return 1;
      const as = Number.isFinite(a.localRankScore) ? a.localRankScore : Number(a.corridorDistanceMeters ?? Infinity);
      const bs = Number.isFinite(b.localRankScore) ? b.localRankScore : Number(b.corridorDistanceMeters ?? Infinity);
      return (as - bs) || (ar - br);
    });
    return mapped.slice(0, Math.max(1, limit));
  }

  function builtinCandidatesForRouteV070(routePath) {
    if (!routeLooksKansaiTokaiV070(routePath)) return [];
    return BUILTIN_KANSAI_TOKAI_IC_NAMES.map((name) => ({
      id: `builtin-${normalizeIcKey(name)}`,
      name,
      road: '内蔵ICカタログ',
      waypoint: `${name}, 日本`,
      mapWaypoint: null,
      source: 'BUILTIN',
    }));
  }

  function routeLooksKansaiTokaiV070(routePath) {
    if (!routePath.length) return false;
    const lats = routePath.map((p) => p.lat);
    const lngs = routePath.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return maxLat >= 34.0 && minLat <= 36.6 && maxLng >= 135.3 && minLng <= 139.3 && minLng >= 134.0 && maxLng <= 140.5;
  }

  function candidateProjectionPointV070(candidate) {
    return readCoordinate(candidate?.mapWaypoint) || readCoordinate(candidate?.waypoint);
  }

  function cachedIcCandidatesNearRouteV070(routePath, maxDistanceMeters) {
    if (!routePath.length || !persistentIcCatalog.length) return [];
    return persistentIcCatalog.map((stored) => restoreStoredIcV070(stored))
      .filter(Boolean)
      .map((candidate) => {
        const point = candidateProjectionPointV070(candidate);
        if (!point) return candidate;
        return { ...candidate, ...projectPointToRoute(point, routePath) };
      })
      .filter((candidate) => !Number.isFinite(candidate.corridorDistanceMeters) || candidate.corridorDistanceMeters <= maxDistanceMeters);
  }

  function restoreStoredIcV070(stored) {
    const lat = Number(stored?.lat);
    const lng = Number(stored?.lng);
    if (!stored?.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const mapWaypoint = { lat, lng };
    const source = String(stored.source || 'CACHE');
    return {
      id: stored.id || `cache-${normalizeIcKey(stored.name)}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      navitimeIcId: stored.navitimeIcId || null,
      name: stored.name,
      road: stored.road || '保存済みIC',
      waypoint: source === 'NAVITIME_IC' ? mapWaypoint : `${stored.name}, 日本`,
      mapWaypoint,
      source,
    };
  }

  function rememberIcCandidatesV070(candidates) {
    const merged = new Map();
    for (const stored of persistentIcCatalog) {
      const key = `${normalizeIcKey(stored.name)}:${Number(stored.lat).toFixed(3)}:${Number(stored.lng).toFixed(3)}`;
      merged.set(key, stored);
    }
    for (const candidate of candidates || []) {
      const point = candidateProjectionPointV070(candidate);
      if (!point || !candidate?.name) continue;
      const stored = {
        id: candidate.id || null,
        navitimeIcId: candidate.navitimeIcId || null,
        name: candidate.name,
        road: candidate.road || '',
        lat: point.lat,
        lng: point.lng,
        source: candidate.source || 'CACHE',
        savedAt: Date.now(),
      };
      const key = `${normalizeIcKey(stored.name)}:${stored.lat.toFixed(3)}:${stored.lng.toFixed(3)}`;
      merged.set(key, stored);
    }
    persistentIcCatalog = [...merged.values()]
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
      .slice(0, IC_CATALOG_MAX);
    safeStorageSet(STORAGE_KEY_IC_CATALOG, JSON.stringify(persistentIcCatalog));
  }

  async function discoverOsmIcNearPointsV070(points) {
    if (IC_DISCOVERY_NETWORK_DISABLED) return [];
    const unique = [];
    for (const point of points) {
      const p = readCoordinate(point);
      if (!p) continue;
      if (!unique.some((x) => haversineMeters(x, p) < 12_000)) unique.push(p);
    }
    const groups = await mapWithConcurrency(unique.slice(0, 5), OSM_DISCOVERY_CONCURRENCY, (point) => fetchOsmIcCellV070(point));
    return dedupeIcCandidatesV070(groups.flat().filter(Boolean));
  }

  async function fetchOsmIcCellV070(point) {
    if (IC_DISCOVERY_NETWORK_DISABLED) return [];
    const cellKey = `${(Math.round(point.lat * 20) / 20).toFixed(2)}:${(Math.round(point.lng * 20) / 20).toFixed(2)}`;
    if (OSM_CELL_CACHE.has(cellKey)) return OSM_CELL_CACHE.get(cellKey);
    const box = bboxAround(point, OSM_DISCOVERY_RADIUS_KM);
    const query = `[out:json][timeout:12];node["highway"="motorway_junction"](${box.south.toFixed(5)},${box.west.toFixed(5)},${box.north.toFixed(5)},${box.east.toFixed(5)});out body;`;
    let parsed = [];
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 13_000);
        incrementApiUsage('overpass', 1);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (!response.ok) continue;
        const data = await response.json();
        parsed = parseOverpassIcCandidates(data).map((candidate) => {
          const mapWaypoint = readCoordinate(candidate.waypoint);
          return {
            ...candidate,
            waypoint: `${candidate.name}, 日本`,
            mapWaypoint,
            road: candidate.road || 'OpenStreetMap',
            source: 'OSM',
          };
        });
        break;
      } catch (error) {
        console.warn('Small Overpass discovery failed:', endpoint, error);
      }
    }
    OSM_CELL_CACHE.set(cellKey, parsed);
    return parsed;
  }

  async function discoverNavitimeIcLimitedV070(points, apiKey) {
    const out = [];
    const unique = [];
    for (const point of points) {
      const p = readCoordinate(point);
      if (!p) continue;
      if (!unique.some((x) => haversineMeters(x, p) < 14_000)) unique.push(p);
    }
    for (const point of unique.slice(0, NAVITIME_IC_CALL_LIMIT)) {
      if (!canUseNavitime()) break;
      try {
        const group = await fetchNavitimeIcSearch({ apiKey, coord: point, radiusMeters: NAVITIME_IC_SEARCH_RADIUS_M });
        out.push(...group.map((candidate) => ({ ...candidate, mapWaypoint: readCoordinate(candidate.waypoint) })));
      } catch (error) {
        console.warn('NAVITIME IC discovery skipped:', error);
        if (!canUseNavitime()) break;
      }
    }
    return dedupeIcCandidatesV070(out);
  }

  function dedupeIcCandidatesV070(candidates) {
    const rank = { RETAINED: 6, NATIONAL: 5, NAVITIME_IC: 4, CACHE: 3, OSM: 2, BUILTIN: 1 };
    const byName = new Map();
    for (const candidate of candidates || []) {
      if (!candidate?.name) continue;
      const key = normalizeIcKey(candidate.name);
      if (!key) continue;
      const existing = byName.get(key);
      const score = rank[candidate.source] || 0;
      const existingScore = rank[existing?.source] || 0;
      if (!existing || score > existingScore || (candidate.navitimeIcId && !existing.navitimeIcId)) byName.set(key, candidate);
    }
    return [...byName.values()];
  }

  function candidateEvaluationKeyV074(candidate) {
    const nameKey = normalizeIcKey(candidate?.name || '');
    return nameKey || String(candidate?.id || '');
  }

  function selectUnevaluatedCandidatesV074(candidates, limit) {
    const unique = dedupeIcCandidatesV070(candidates);
    const unseen = [];
    let reused = 0;
    for (const candidate of unique) {
      const key = candidateEvaluationKeyV074(candidate);
      if (key && evaluatedCandidateKeysCurrent.has(key)) {
        reused += 1;
        continue;
      }
      unseen.push(candidate);
    }
    const selected = prefilterDiscoveredCandidatesV071(unseen, limit);
    for (const candidate of selected) {
      const key = candidateEvaluationKeyV074(candidate);
      if (key) evaluatedCandidateKeysCurrent.add(key);
    }
    return {
      selected,
      discovered: unique.length,
      reused,
      eligible: unseen.length,
    };
  }

  async function evaluateCandidatePoolV070({
    Route,
    RouteMatrix,
    origin,
    destination,
    now,
    practicalDeadline,
    localDirectDurationMs,
    normalDirectDurationMs,
    candidates,
    matrixCandidateLimit = NATIONAL_IC_PREFILTER_LIMIT,
  }) {
    const selection = selectUnevaluatedCandidatesV074(candidates, matrixCandidateLimit);
    const discoveredCount = selection.discovered;
    const reusedCount = selection.reused;
    const matrixCandidates = selection.selected;
    if (!matrixCandidates.length) return { exact: [], safe: [], stats: { discovered: discoveredCount, reused: reusedCount, sent: 0, approxSafe: 0, safe: 0 } };
    let local = (await attachLocalMatrixChunked(RouteMatrix, origin, matrixCandidates, now))
      .filter((candidate) => candidate.exists && Number.isFinite(candidate.localDurationMs) && candidate.localDurationMs > 0)
      .filter((candidate) => candidate.localDurationMs <= Math.max(localDirectDurationMs * 1.12, normalDirectDurationMs + 3 * 60 * 60_000));
    if (!local.length) return { exact: [], safe: [], stats: { discovered: discoveredCount, reused: reusedCount, sent: matrixCandidates.length, approxSafe: 0, safe: 0 } };

    const fastApprox = await attachFastMatrixApproxChunkedV070(RouteMatrix, local, destination, now);
    const combined = combineApproximateMatrixResults(local, fastApprox, now, practicalDeadline)
      .filter((item) => item.fastApproxExists && item.approxTotalDurationMs > 0);
    if (!combined.length) return { exact: [], safe: [], stats: { discovered: discoveredCount, reused: reusedCount, sent: matrixCandidates.length, approxSafe: 0, safe: 0 } };

    const byDeadline = combined.slice().sort((a, b) => {
      const ag = Math.abs(practicalDeadline.getTime() - a.approxEta.getTime());
      const bg = Math.abs(practicalDeadline.getTime() - b.approxEta.getTime());
      return ag - bg;
    });
    const approxSafeLatest = combined.filter((x) => x.approxSafe).sort((a, b) => b.localDurationMs - a.localDurationMs).slice(0, 6);
    const earliest = combined.slice().sort((a, b) => a.localDurationMs - b.localDurationMs).slice(0, 3);
    const retained = combined.filter((x) => x.source === 'RETAINED');
    const exactPool = dedupeIcCandidatesV070([
      ...retained,
      ...byDeadline.slice(0, 8),
      ...approxSafeLatest,
      ...earliest,
    ]).slice(0, V070_EXACT_LIMIT);

    let exact = await mapWithConcurrency(exactPool, 4, (candidate) => evaluateCandidateTiming({
      Route,
      candidate,
      destination,
      now,
      practicalDeadline,
      localDirectDurationMs,
    }));
    exact = exact.filter((item) => item && !item.failed);
    let safe = exact.filter((item) => item.safe);

    // If the coarse matrix was misleading, explicitly probe a few of the
    // quickest-to-reach entrances before declaring discovery failure.
    if (!safe.length) {
      const extra = combined.slice().sort((a, b) => a.localDurationMs - b.localDurationMs)
        .filter((candidate) => !exact.some((x) => x.id === candidate.id)).slice(0, 5);
      const extraExact = await mapWithConcurrency(extra, 3, (candidate) => evaluateCandidateTiming({
        Route,
        candidate,
        destination,
        now,
        practicalDeadline,
        localDirectDurationMs,
      }));
      exact = [...exact, ...extraExact.filter((item) => item && !item.failed)];
      safe = exact.filter((item) => item.safe);
    }

    return {
      exact: dedupeCandidates(exact),
      safe: dedupeCandidates(safe),
      stats: {
        discovered: discoveredCount,
        reused: reusedCount,
        sent: matrixCandidates.length,
        approxSafe: combined.filter((item) => item.approxSafe).length,
        safe: dedupeCandidates(safe).length,
      },
    };
  }

  async function attachFastMatrixApproxChunkedV070(RouteMatrix, candidates, destination, departureTime) {
    const out = [];
    for (let i = 0; i < candidates.length; i += 25) {
      const chunk = candidates.slice(i, i + 25);
      const result = await attachFastMatrixApprox(RouteMatrix, chunk, destination, departureTime);
      out.push(...result);
    }
    return out;
  }

  async function priceFinalistsV070({ Route, destination, practicalDeadline, candidates, navitimeApiKey }) {
    const safe = candidates.filter((item) => item?.safe).slice();
    const latest = safe.sort((a, b) => b.localDurationMs - a.localDurationMs);
    const pricingPool = dedupeIcCandidatesV070([
      ...latest.slice(0, 3),
      ...selectLocalDurationRepresentativesV070(latest.slice(3), 1),
    ]).slice(0, V070_GOOGLE_TOLL_LIMIT);

    let priced = await mapWithConcurrency(pricingPool, 2, (candidate) => priceCandidateGoogleV070(Route, candidate, destination, practicalDeadline));

    // Google accepts JP_ETC in the request, but a supported toll pass enum does
    // not guarantee an estimated price for every Japanese route. NAVITIME is a
    // strictly limited fallback for missing prices, never a prerequisite.
    if (navitimeApiKey && canUseNavitime()) {
      let used = 0;
      const updated = [];
      for (const candidate of priced) {
        if (Number.isFinite(candidate.toll?.yen) || used >= V070_NAVITIME_FARE_LIMIT || !canUseNavitime()) {
          updated.push(candidate);
          continue;
        }
        try {
          if (!candidate.endpoints?.goal) {
            updated.push(candidate);
            continue;
          }
          const fare = await fetchNavitimeEtcFare({
            apiKey: navitimeApiKey,
            start: candidate.endpoints?.start || candidate.waypoint,
            startIcId: candidate.navitimeIcId || null,
            goal: candidate.endpoints.goal,
            departureTime: candidate.icArrival,
            startName: candidate.name,
            forceTollStart: !candidate.navitimeIcId,
          });
          updated.push({ ...candidate, toll: fare, navitimeFareError: null });
          FARE_CACHE.set(`${normalizeIcKey(candidate.name)}|${String(destination).trim()}`, { toll: fare, at: Date.now() });
          used += 1;
        } catch (error) {
          console.warn('NAVITIME fare fallback skipped:', candidate.name, error);
          updated.push({ ...candidate, navitimeFareError: shortError(error) });
          used += 1;
        }
      }
      priced = updated;
    }

    const known = priced.filter((item) => Number.isFinite(item.toll?.yen));
    const pricingComplete = priced.length > 0 && known.length === priced.length;
    let selected = null;
    let basis = 'time';
    if (known.length >= 2) {
      selected = known.slice().sort((a, b) => (a.toll.yen - b.toll.yen)
        || (b.localDurationMs - a.localDurationMs))[0];
      basis = pricingComplete ? 'price_complete' : 'price_partial';
    } else if (known.length === 1 && priced.length === 1) {
      selected = known[0];
      basis = 'price_complete';
    } else {
      selected = latest[0] || known[0] || null;
    }
    if (selected) selected = { ...selected, selectionBasis: basis };
    return { selected, priced, pricingComplete };
  }

  function selectLocalDurationRepresentativesV070(candidates, limit) {
    if (!candidates.length || limit <= 0) return [];
    const ordered = candidates.slice().sort((a, b) => a.localDurationMs - b.localDurationMs);
    if (ordered.length <= limit) return ordered;
    const out = [];
    for (let i = 0; i < limit; i += 1) {
      const index = Math.round((ordered.length - 1) * ((i + 1) / (limit + 1)));
      out.push(ordered[index]);
    }
    return out;
  }

  async function priceCandidateGoogleV070(Route, candidate, destination, practicalDeadline) {
    const cacheKey = `${normalizeIcKey(candidate.name)}|${String(destination).trim()}`;
    const cached = FARE_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.at < FARE_CACHE_TTL_MS) {
      return { ...candidate, toll: cached.toll, googleTollChecked: true };
    }
    try {
      const fastRoute = await computeFastLeg(Route, candidate.waypoint, destination, candidate.icArrival, { includeTolls: true });
      if (!fastRoute) return { ...candidate, toll: { text: '料金未取得', yen: null, source: 'Google' }, googleTollChecked: true };
      const durationMs = Number(fastRoute.durationMillis || candidate.fastDurationMs || 0);
      const tollRaw = extractTollMoney(fastRoute);
      const toll = { ...tollRaw, source: 'Google' };
      const totalDurationMs = candidate.localDurationMs + durationMs;
      const destinationEta = new Date(candidate.icArrival.getTime() + durationMs);
      const switchDeadline = new Date(practicalDeadline.getTime() - durationMs);
      const endpoints = routeEndpoints(fastRoute) || candidate.endpoints;
      FARE_CACHE.set(cacheKey, { toll, at: Date.now() });
      return {
        ...candidate,
        fastDurationMs: durationMs,
        totalDurationMs,
        destinationEta,
        switchDeadline,
        endpoints,
        toll,
        googleTollChecked: true,
      };
    } catch (error) {
      console.warn('Google toll estimate unavailable:', candidate.name, error);
      const toll = { text: '料金未取得', yen: null, source: 'Google' };
      FARE_CACHE.set(cacheKey, { toll, at: Date.now() });
      return { ...candidate, toll, googleTollChecked: true };
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
    if (IC_DISCOVERY_NETWORK_DISABLED) return [];
    if (!apiKey || !canUseNavitime()) throw new Error('NAVITIME補助は現在利用できません。');
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
      incrementApiUsage('navitimeIc', 1);
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
      if (response.status === 429) markNavitimeQuotaBlocked('monthly_quota');
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
    const { matrix } = await trackedComputeRouteMatrix(RouteMatrix, request);
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
    const { matrix } = await trackedComputeRouteMatrix(RouteMatrix, request);
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
    const googleToll = { text: '未取得', yen: null };
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
    const result = await trackedComputeRoutes(Route, request);
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
    if (IC_DISCOVERY_NETWORK_DISABLED) return [];
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

  async function computeFastLeg(Route, origin, destination, departureTime, options = {}) {
    const includeTolls = Boolean(options.includeTolls);
    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      language: 'ja',
      fields: includeTolls
        ? ['durationMillis', 'distanceMeters', 'travelAdvisory', 'legs']
        : ['durationMillis', 'distanceMeters', 'legs'],
    };
    if (includeTolls) {
      request.extraComputations = ['TOLLS'];
      request.routeModifiers = {
        vehicleInfo: { emissionType: 'GASOLINE' },
        tollPasses: ['JP_ETC'],
      };
    }

    // Routes Library only accepts an explicitly supplied departureTime when it
    // is in the future. For an immediate departure, omit the field and Google
    // automatically uses the request time. Add a small guard band so network
    // latency cannot turn a just-created Date into a past timestamp.
    if (departureTime instanceof Date && departureTime.getTime() > Date.now() + 30_000) {
      request.departureTime = departureTime;
    }

    const result = await trackedComputeRoutes(Route, request);
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
    const hasFare = Number.isFinite(candidate.toll?.yen);
    if (candidate.selectionBasis === 'price_complete') {
      els.switchModeLabel.textContent = '到着条件を満たす候補の中で料金最小';
    } else if (candidate.selectionBasis === 'price_partial') {
      els.switchModeLabel.textContent = '取得できた料金の中で最小';
    } else if (hasFare) {
      els.switchModeLabel.textContent = '到着条件を満たす高速入口';
    } else {
      els.switchModeLabel.textContent = '到着条件を優先した暫定候補';
    }
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
    els.tollPrice.textContent = hasFare ? `ETC ${formatToll(candidate)}` : 'ETC料金は取得できませんでした';
    els.switchSummary.classList.remove('hidden');
  }

  function renderSwitchUnavailable(title, note = '') {
    els.switchModeLabel.textContent = '現在の案内';
    els.switchIc.textContent = title || '再確認中';
    els.switchRoad.textContent = note || '経路を再確認しています';
    els.switchArrival.textContent = '—';
    els.switchDeadline.textContent = '—';
    els.switchRemaining.textContent = '—';
    if (els.navChangeAdvice) els.navChangeAdvice.textContent = '—';
    els.switchDestinationEta.textContent = '—';
    els.switchToll.textContent = '—';
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
      const test = await trackedComputeRoutes(Route, {
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
    els.tollPrice.textContent = '料金は候補確定後に表示';
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
    if (!apiKey || !canUseNavitime()) throw new Error('NAVITIME補助は現在利用できません。');
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
      incrementApiUsage('navitimeRoute', 1);
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
      if (response.status === 429) markNavitimeQuotaBlocked('monthly_quota');
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
    if (Number.isFinite(toll?.yen)) {
      if (toll?.source === 'NAVITIME') return `${toll.text}（NAVITIME）`;
      if (toll?.source === 'Google') return `${toll.text}（Google推定）`;
      return toll.text || `${Math.round(toll.yen).toLocaleString('ja-JP')}円`;
    }
    return '料金未取得';
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

