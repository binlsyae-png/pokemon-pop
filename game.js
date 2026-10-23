// 포켓몬 팡팡! (PokeWhack!) - 메인 게임 로직
import { TRAINERS, POKEMON_LIST, BOMB_LIST } from './pokemonData.js';
import { soundManager } from './audio.js';

class PokePopGame {
  constructor() {
    this.selectedTrainer = TRAINERS[0];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('poke_pop_highscore') || '0', 10);
    this.timeLeft = 30.0;
    this.totalGameTime = 30.0;
    this.isPlaying = false;
    this.isPaused = false;
    this.gameLoopInterval = null;
    this.timerInterval = null;
    this.combo = 0;
    this.maxCombo = 0;
    this.caughtCount = 0;
    this.caughtStats = {}; // 포켓몬별 잡은 수
    this.currentWaveHighestScore = 0; // 찬스 웨이브 시 최고점 포켓몬 점수

    // 구멍 상태 배열 (9개)
    // 각 구멍: { id, elem, currentPoke, timer, isHit }
    this.holes = [];

    // DOM 요소 캐싱
    this.cacheDOM();

    // 트레이너 선택 렌더링
    this.renderTrainerSelection();

    // 3x3 구멍 슬롯 초기화
    this.initHolesGrid();

    // 파티클 캔버스 초기화
    this.initParticles();

    // 이벤트 리스너 등록
    this.bindEvents();

    // 오디오 첫 클릭 활성화 리스너
    const unlockAudio = () => {
      soundManager.initContext();
      window.removeEventListener('pointerdown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
  }

  cacheDOM() {
    this.startScreen = document.getElementById('start-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.resultScreen = document.getElementById('result-screen');
    this.rulesModal = document.getElementById('rules-modal');

    this.trainerGridElem = document.getElementById('trainer-grid');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnRules = document.getElementById('btn-rules');
    this.btnCloseRules = document.getElementById('btn-close-rules');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnGameSoundToggle = document.getElementById('btn-game-sound-toggle');

    // 초기 화면 상태 보장: 오직 시작 화면만 단독 노출
    this.startScreen.classList.remove('hidden');
    this.startScreen.style.display = 'flex';
    this.gameScreen.classList.add('hidden');
    this.gameScreen.style.display = 'none';
    this.resultScreen.classList.add('hidden');
    this.resultScreen.style.display = 'none';
    this.btnHome = document.getElementById('btn-home');

    // 카운트다운 오버레이 & 찬스 배너
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    this.countdownSub = document.getElementById('countdown-sub');
    this.chanceBanner = document.getElementById('chance-banner');

    // 게임 HUD
    this.hudTrainerAvatar = document.getElementById('hud-trainer-avatar');
    this.hudTrainerName = document.getElementById('hud-trainer-name');
    this.hudHammerBadge = document.getElementById('hud-hammer-badge');
    this.hudTimeVal = document.getElementById('hud-time-val');
    this.hudTimeProgress = document.getElementById('hud-time-progress');
    this.hudScoreVal = document.getElementById('hud-score-val');
    this.hudComboBadge = document.getElementById('hud-combo-badge');

    // 트레이너 스테이지
    this.activeTrainerAvatar = document.getElementById('active-trainer-avatar');
    this.trainerSpriteImg = document.getElementById('trainer-sprite-img');
    this.heldHammer = document.getElementById('held-hammer');
    this.strikeHammer = document.getElementById('strike-hammer');

    // 결과 화면
    this.resFinalScore = document.getElementById('res-final-score');
    this.resHighScore = document.getElementById('res-high-score');
    this.resCaughtCount = document.getElementById('res-caught-count');
    this.resMaxCombo = document.getElementById('res-max-combo');
    this.resTrainerAvatar = document.getElementById('res-trainer-avatar');
    this.resTrainerName = document.getElementById('res-trainer-name');
    this.resRank = document.getElementById('res-rank');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnResultHome = document.getElementById('btn-result-home');

    // 캔버스
    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  // ==========================================
  // 망치 SVG 제너레이터 (각 트레이너별 특색 망치)
  // ==========================================
  getHammerSVG(trainerId) {
    switch (trainerId) {
      case 'ash': // 피코피코 뿅망치
        return `
          <svg class="hammer-svg" viewBox="0 0 100 100">
            <!-- 자루 -->
            <rect x="44" y="38" width="12" height="58" rx="6" fill="#f59e0b" stroke="#b45309" stroke-width="3" />
            <rect x="42" y="80" width="16" height="12" rx="4" fill="#ef4444" stroke="#991b1b" stroke-width="2" />
            <!-- 원통형 빨강 뿅망치 헤드 -->
            <rect x="12" y="10" width="76" height="34" rx="10" fill="#ef4444" stroke="#991b1b" stroke-width="4" />
            <!-- 양쪽 노란 캡 -->
            <ellipse cx="14" cy="27" rx="8" ry="17" fill="#fbbf24" stroke="#b45309" stroke-width="3" />
            <ellipse cx="86" cy="27" rx="8" ry="17" fill="#fbbf24" stroke="#b45309" stroke-width="3" />
            <!-- 몬스터볼 마크 -->
            <circle cx="50" cy="27" r="9" fill="#ffffff" stroke="#1f2937" stroke-width="2.5" />
            <circle cx="50" cy="27" r="3.5" fill="#ef4444" />
          </svg>
        `;
      case 'misty': // 아쿠아 스타 해머
        return `
          <svg class="hammer-svg" viewBox="0 0 100 100">
            <!-- 자루 -->
            <rect x="44" y="42" width="12" height="54" rx="6" fill="#38bdf8" stroke="#0284c7" stroke-width="3" />
            <!-- 아쿠아 헤드 -->
            <rect x="16" y="16" width="68" height="32" rx="12" fill="#0284c7" stroke="#0369a1" stroke-width="4" />
            <!-- 불가사리 스타 장식 -->
            <path d="M50 8 L54 22 L68 22 L57 31 L61 45 L50 36 L39 45 L43 31 L32 22 L46 22 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
            <!-- 물방울 캡 -->
            <circle cx="20" cy="32" r="10" fill="#bae6fd" stroke="#0284c7" stroke-width="2" />
            <circle cx="80" cy="32" r="10" fill="#bae6fd" stroke="#0284c7" stroke-width="2" />
          </svg>
        `;
      case 'brock': // 바위 깨기 메이스
        return `
          <svg class="hammer-svg" viewBox="0 0 100 100">
            <!-- 단단한 자루 -->
            <rect x="43" y="38" width="14" height="58" rx="5" fill="#78716c" stroke="#44403c" stroke-width="3" />
            <!-- 메탈 링 -->
            <rect x="41" y="48" width="18" height="6" fill="#d97706" />
            <!-- 거친 바위 메이스 헤드 -->
            <polygon points="50,6 82,22 84,48 50,56 16,48 18,22" fill="#a8a29e" stroke="#44403c" stroke-width="4" />
            <!-- 바위 스파이크 -->
            <polygon points="50,2 54,8 46,8" fill="#d97706" />
            <polygon points="86,35 80,32 80,38" fill="#d97706" />
            <polygon points="14,35 20,32 20,38" fill="#d97706" />
          </svg>
        `;
      case 'serena': // 매지컬 리본 해머
        return `
          <svg class="hammer-svg" viewBox="0 0 100 100">
            <!-- 마법 지팡이 자루 -->
            <rect x="45" y="40" width="10" height="56" rx="5" fill="#f472b6" stroke="#db2777" stroke-width="2.5" />
            <!-- 핑크 하트 헤드 -->
            <path d="M50 48 C25 22, 10 32, 28 14 C42 0, 50 18, 50 18 C50 18, 58 0, 72 14 C90 32, 75 22, 50 48 Z" fill="#ec4899" stroke="#be185d" stroke-width="3" />
            <!-- 리본 -->
            <path d="M40 46 L60 54 M60 46 L40 54" stroke="#fbbf24" stroke-width="5" stroke-linecap="round" />
            <!-- 중앙 보석 -->
            <circle cx="50" cy="24" r="7" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
          </svg>
        `;
      default:
        return this.getHammerSVG('ash');
    }
  }

  // ==========================================
  // 트레이너 선택 화면 UI 구성
  // ==========================================
  renderTrainerSelection() {
    this.trainerGridElem.innerHTML = '';

    TRAINERS.forEach((trainer) => {
      const card = document.createElement('div');
      card.className = `trainer-card ${trainer.id === this.selectedTrainer.id ? 'selected' : ''}`;
      card.style.setProperty('--trainer-color', trainer.themeColor);
      card.dataset.trainerId = trainer.id;

      card.innerHTML = `
        <div class="selected-check">✓</div>
        <div class="trainer-avatar-wrap">
          <img class="trainer-avatar-img" src="${trainer.avatar}" alt="${trainer.name}" 
               onerror="if(this.src !== '${trainer.fallbackAvatar}') { this.src = '${trainer.fallbackAvatar}'; }">
        </div>
        <div class="trainer-name">${trainer.name}</div>
        <div class="trainer-role">${trainer.title}</div>
        <div class="trainer-hammer-tag">🔨 ${trainer.hammerName}</div>
      `;

      // 1회 클릭: 선택
      card.addEventListener('click', () => {
        soundManager.initContext();
        soundManager.playScoreChime(1, 1);
        this.selectTrainer(trainer.id);
      });

      // 더블 클릭: 즉시 게임 시작!
      card.addEventListener('dblclick', () => {
        soundManager.initContext();
        this.selectTrainer(trainer.id);
        this.startGame();
      });

      this.trainerGridElem.appendChild(card);
    });

    this.updateTrainerVisuals();
  }

  selectTrainer(trainerId) {
    const found = TRAINERS.find(t => t.id === trainerId);
    if (!found) return;
    this.selectedTrainer = found;

    // 선택 클래스 토글
    document.querySelectorAll('.trainer-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.trainerId === trainerId);
    });

    this.updateTrainerVisuals();
  }

  updateTrainerVisuals() {
    const t = this.selectedTrainer;
    this.hudTrainerName.textContent = t.name;
    this.hudTrainerAvatar.src = t.avatar;
    this.hudTrainerAvatar.onerror = () => {
      if (this.hudTrainerAvatar.src !== t.fallbackAvatar) {
        this.hudTrainerAvatar.src = t.fallbackAvatar;
      }
    };
    this.hudHammerBadge.textContent = `🔨 ${t.hammerName}`;

    // 게임 하단 트레이너 아바타
    this.trainerSpriteImg.src = t.avatar;
    this.trainerSpriteImg.onerror = () => {
      if (this.trainerSpriteImg.src !== t.fallbackAvatar) {
        this.trainerSpriteImg.src = t.fallbackAvatar;
      }
    };

    // 트레이너가 쥐고 있는 망치 & 타격용 망치 SVG 업데이트
    const hammerSvgHtml = this.getHammerSVG(t.id);
    this.heldHammer.innerHTML = hammerSvgHtml;
    this.strikeHammer.innerHTML = hammerSvgHtml;
  }

  // ==========================================
  // 3×3 구멍 9개 초기화
  // ==========================================
  initHolesGrid() {
    const grid = document.getElementById('holes-grid');
    grid.innerHTML = '';
    this.holes = [];

    for (let i = 0; i < 9; i++) {
      const holeUnit = document.createElement('div');
      holeUnit.className = 'hole-unit';
      holeUnit.dataset.index = i;

      holeUnit.innerHTML = `
        <div class="hole-base"></div>
        <div class="pokemon-slot" id="slot-${i}">
          <img class="pokemon-entity" id="poke-img-${i}" alt="pokemon" />
        </div>
        <div class="hole-grass-front"></div>
      `;

      // 구멍 클릭 이벤트 바인딩
      holeUnit.addEventListener('pointerdown', (e) => this.handleHoleClick(i, e));

      grid.appendChild(holeUnit);

      this.holes.push({
        id: i,
        unitElem: holeUnit,
        slotElem: holeUnit.querySelector('.pokemon-slot'),
        imgElem: holeUnit.querySelector('.pokemon-entity'),
        currentPoke: null,
        timer: null,
        isHit: false
      });
    }

    // 규칙 모달의 포켓몬 점수표 렌더링
    this.renderRulesInfo();
  }

  renderRulesInfo() {
    const grid = document.getElementById('rules-poke-grid');
    if (!grid) return;
    grid.innerHTML = '';

    POKEMON_LIST.forEach(poke => {
      const item = document.createElement('div');
      item.className = `rule-poke-item ${poke.isBomb ? 'bomb-rule' : ''}`;
      item.innerHTML = `
        <img class="rule-poke-img" src="${poke.imgUrl}" alt="${poke.name}" onerror="this.src='${poke.pixelUrl}'">
        <div>
          <div class="rule-poke-name">${poke.name} ${poke.isBomb ? '💣 함정!' : ''}</div>
          <div class="rule-poke-score">${poke.isBomb ? '-5점 감점 & 대폭발!' : `+${poke.score}점 (${poke.typeName})`}</div>
        </div>
      `;
      grid.appendChild(item);
    });
  }

  // ==========================================
  // 망치 스윙 애니메이션 & 타격 처리
  // ==========================================
  triggerHammerSwing(targetX, targetY) {
    // 1. 하단 트레이너 스윙 제스처
    this.activeTrainerAvatar.classList.remove('swing');
    void this.activeTrainerAvatar.offsetWidth; // 리플로우
    this.activeTrainerAvatar.classList.add('swing');

    // 2. 타격 지점으로 망치 순간이동 후 스윙
    const wrapperRect = document.getElementById('game-wrapper').getBoundingClientRect();
    const relX = targetX - wrapperRect.left;
    const relY = targetY - wrapperRect.top;

    this.strikeHammer.style.left = `${relX}px`;
    this.strikeHammer.style.top = `${relY}px`;

    this.strikeHammer.classList.remove('whack-anim');
    void this.strikeHammer.offsetWidth;
    this.strikeHammer.classList.add('whack-anim');

    // 3. 휘두르기 소리
    soundManager.playHammerSwing();
  }

  // ==========================================
  // 구멍 클릭 처리
  // ==========================================
  handleHoleClick(index, event) {
    if (!this.isPlaying || this.isPaused) return;

    const hole = this.holes[index];
    const clickX = event.clientX;
    const clickY = event.clientY;

    // 망치 스윙 발동
    this.triggerHammerSwing(clickX, clickY);

    // 포켓몬이 활성화되어 있고 아직 타격되지 않은 경우
    if (hole.currentPoke && !hole.isHit) {
      this.hitPokemon(hole, event);
    } else {
      // 포켓몬이 없거나 이미 잡힌 구멍 클릭 (Miss)
      this.missHole(hole, event);
    }
  }

  // 포켓몬 명중!
  hitPokemon(hole, event) {
    hole.isHit = true;
    const poke = hole.currentPoke;

    // 💣 찌리리공(폭탄) 타격 시 대폭발 및 감점 패널티!
    if (poke.isBomb) {
      try {
        soundManager.playPokemonCry('bomb');
      } catch (e) {}

      // 점수 감점 (5점 감점, 최소 0점 유지)
      this.score = Math.max(0, this.score + poke.score);
      this.combo = 0; // 콤보 리셋

      // 화면 진동 (Screen Shake)
      const wrapper = document.getElementById('game-wrapper');
      if (wrapper) {
        wrapper.classList.remove('screen-shake');
        void wrapper.offsetWidth;
        wrapper.classList.add('screen-shake');
      }

      // HUD 업데이트
      this.updateHUD();

      // 슬롯 애니메이션
      hole.slotElem.classList.remove('active');
      hole.slotElem.classList.add('hit');
      hole.slotElem.style.setProperty('--poke-glow', 'rgba(239, 68, 68, 1)');

      // 플로팅 감점 텍스트
      this.showFloatingScore(hole.unitElem, `-5 BOOM! 💥`, '#ff1744');
      this.showHitBurst(hole.unitElem, { cry: '💥 대폭발!!' });

      // 폭발 화염 & 연기 파티클
      const rect = hole.unitElem.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45;
      this.spawnParticles(centerX, centerY, '#ff3d00', 'bomb');
      this.spawnParticles(centerX, centerY, '#424242', 'smoke');

      if (hole.timer) clearTimeout(hole.timer);
      hole.timer = setTimeout(() => {
        this.hidePokemon(hole);
      }, 450);
      return;
    }

    // 일반 포켓몬 타격
    soundManager.playHammerHit();
    soundManager.playPokemonCry(poke.soundType);

    // 콤보 계산
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // 찬스 웨이브에서 가장 점수가 높은 포켓몬을 잡았는지 체크!
    let isHighestBonus = false;
    let bonusPoints = 0;
    if (this.currentWaveHighestScore > 0 && poke.score === this.currentWaveHighestScore) {
      isHighestBonus = true;
      bonusPoints = 10; // 최고점 포켓몬 포획 추가 보너스!
      this.currentWaveHighestScore = 0; // 웨이브당 1회만 보너스 적용
    }

    // 점수 가산 (+ 콤보 보너스 + 찬스 최고점 보너스)
    const comboBonus = Math.floor((this.combo - 1) / 3);
    const addedScore = poke.score + comboBonus + bonusPoints;
    this.score += addedScore;
    this.caughtCount++;
    this.caughtStats[poke.id] = (this.caughtStats[poke.id] || 0) + 1;

    // 점수 보너스 사운드
    soundManager.playScoreChime(addedScore, this.combo);

    // HUD 업데이트
    this.updateHUD();

    // 포켓몬 슬롯 피격 애니메이션 상태로 전환
    hole.slotElem.classList.remove('active');
    hole.slotElem.classList.add('hit');
    hole.slotElem.style.setProperty('--poke-glow', isHighestBonus ? 'rgba(255, 235, 59, 1)' : poke.glowColor);

    // 플로팅 점수 (+3, +10) 텍스트 팝업
    const floatText = isHighestBonus
      ? `🌟 PERFECT! +${addedScore} (최고점 보너스!)`
      : `+${addedScore}${comboBonus > 0 ? ' COMBO!' : ''}`;
    this.showFloatingScore(hole.unitElem, floatText, isHighestBonus ? '#ffeb3b' : poke.color);
    this.showHitBurst(hole.unitElem, isHighestBonus ? { cry: '🌟 최고점 포획!' } : poke);

    // 속성별 화려한 파티클 분출
    const rect = hole.unitElem.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.45;
    this.spawnParticles(centerX, centerY, isHighestBonus ? '#ffeb3b' : poke.color, poke.type);

    // 일정 시간 후 구멍 리셋
    if (hole.timer) clearTimeout(hole.timer);
    hole.timer = setTimeout(() => {
      this.hidePokemon(hole);
    }, 450);
  }

  // 빗맞춤 (Miss)
  missHole(hole, event) {
    soundManager.playMiss();
    this.combo = 0;
    this.updateHUD();

    // Miss 텍스트 팝업
    const missElem = document.createElement('div');
    missElem.className = 'miss-text';
    missElem.textContent = 'Miss!';
    hole.unitElem.appendChild(missElem);
    setTimeout(() => missElem.remove(), 600);
  }

  // 플로팅 점수 표시
  showFloatingScore(parentElem, text, color) {
    const floatElem = document.createElement('div');
    floatElem.className = 'floating-score';
    floatElem.textContent = text;
    floatElem.style.color = color || '#fff';
    parentElem.appendChild(floatElem);

    setTimeout(() => {
      if (floatElem.parentElement) floatElem.remove();
    }, 750);
  }

  // POW! 임팩트 표시
  showHitBurst(parentElem, poke) {
    const burst = document.createElement('div');
    burst.className = 'hit-effect-burst';
    burst.innerHTML = `<span class="burst-pow">${poke.cry || 'POW!'}</span>`;
    parentElem.appendChild(burst);

    setTimeout(() => {
      if (burst.parentElement) burst.remove();
    }, 500);
  }

  // ==========================================
  // 포켓몬 출현 스폰 시스템 (확률 & 속도 공식)
  // ==========================================
  pickRandomPokemon() {
    const totalWeight = POKEMON_LIST.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const poke of POKEMON_LIST) {
      if (rand < poke.weight) {
        return poke;
      }
      rand -= poke.weight;
    }
    return POKEMON_LIST[0];
  }

  pickRandomBomb() {
    return BOMB_LIST[Math.floor(Math.random() * BOMB_LIST.length)];
  }

  // 지정 구멍에 포켓몬 또는 폭탄 활성화
  spawnHole(hole, poke, timeProgress) {
    hole.currentPoke = poke;
    hole.isHit = false;

    hole.imgElem.src = poke.imgUrl;
    hole.imgElem.onerror = () => {
      hole.imgElem.src = poke.pixelUrl;
    };

    hole.slotElem.classList.remove('hit');
    hole.slotElem.classList.add('active');

    const speedMultiplier = Math.max(0.55, 1.0 - timeProgress * 0.45);
    const stayDuration = Math.round(poke.appearDuration * speedMultiplier);

    if (hole.timer) clearTimeout(hole.timer);
    hole.timer = setTimeout(() => {
      this.hidePokemon(hole);
    }, stayDuration);
  }

  hidePokemon(hole) {
    hole.slotElem.classList.remove('active');
    hole.slotElem.classList.remove('hit');

    if (hole.timer) {
      clearTimeout(hole.timer);
      hole.timer = null;
    }

    setTimeout(() => {
      hole.currentPoke = null;
      hole.isHit = false;
      hole.imgElem.src = '';
    }, 200);
  }

  // ==========================================
  // 게임 루프 및 타이머
  // ==========================================
  // 3, 2, 1 카운트다운 후 게임 시작 시퀀스
  startGame() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.caughtCount = 0;
    this.caughtStats = {};
    this.currentWaveHighestScore = 0;
    this.timeLeft = this.totalGameTime;
    this.isPlaying = false; // 카운트다운 동안 타격 대기
    this.isPaused = false;

    // 모든 구멍 비우기
    this.holes.forEach(h => this.hidePokemon(h));

    // 화면 완벽 전환: 시작 화면 완전 종료 후 게임 화면 단독 표시
    this.startScreen.classList.add('hidden');
    this.startScreen.style.display = 'none';
    this.resultScreen.classList.add('hidden');
    this.resultScreen.style.display = 'none';
    this.gameScreen.classList.remove('hidden');
    this.gameScreen.style.display = 'flex';

    this.updateHUD();
    this.updateTrainerVisuals();

    // 3 -> 2 -> 1 -> START! 카운트다운 실행 후 본격 플레이 개시
    this.runCountdown(() => {
      this.startActiveGameplay();
    });
  }

  runCountdown(callback) {
    if (!this.countdownOverlay) {
      if (callback) callback();
      return;
    }

    this.countdownOverlay.classList.remove('hidden');
    const counts = [
      { text: '3', sub: 'READY!', color: '#ff3e3e' },
      { text: '2', sub: 'GET READY!', color: '#ffcb05' },
      { text: '1', sub: 'POKÉMON POP!', color: '#2a75bb' },
      { text: 'START!', sub: '신나게 팡팡!', color: '#4caf50' }
    ];

    let step = 0;

    const playStep = () => {
      if (step < counts.length) {
        const item = counts[step];
        this.countdownNumber.textContent = item.text;
        this.countdownNumber.style.color = item.color;
        this.countdownSub.textContent = item.sub;

        // 리플로우로 애니메이션 재실행
        this.countdownNumber.style.animation = 'none';
        void this.countdownNumber.offsetWidth;
        this.countdownNumber.style.animation = 'countPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

        // 비프음 재생
        const soundNum = step === 3 ? 0 : 3 - step;
        try {
          soundManager.playCountdownBeep(soundNum);
        } catch (e) {
          console.warn(e);
        }

        step++;
        setTimeout(playStep, 800);
      } else {
        // 카운트다운 오버레이 숨기기 및 게임 개시
        this.countdownOverlay.classList.add('hidden');
        if (callback) callback();
      }
    };

    playStep();
  }

  startActiveGameplay() {
    this.isPlaying = true;
    this.isPaused = false;

    // BGM 시작 (에러 방어)
    try {
      soundManager.startBGM();
    } catch (e) {
      console.warn('BGM error:', e);
    }

    // 포켓몬 첫 스폰 즉시 시작
    this.scheduleNextSpawn();

    // 타이머 인터벌 시작 (100ms 단위)
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPlaying || this.isPaused) return;

      this.timeLeft -= 0.1;

      // 째깍 사운드 (마지막 5초)
      if (this.timeLeft <= 5.0 && this.timeLeft > 0) {
        if (Math.round(this.timeLeft * 10) % 10 === 0) {
          try {
            soundManager.playTick(this.timeLeft <= 2.0);
          } catch (e) {}
        }
      }

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame();
      }

      this.updateHUD();
    }, 100);
  }

  scheduleNextSpawn() {
    if (!this.isPlaying || this.isPaused) return;

    const emptyHoles = this.holes.filter(h => !h.currentPoke);
    if (emptyHoles.length === 0) {
      this.gameLoopInterval = setTimeout(() => this.scheduleNextSpawn(), 400);
      return;
    }

    const timeProgress = 1 - (this.timeLeft / this.totalGameTime);

    // 가끔(약 22% 확률) 여러 포켓몬이 등장하여 최고점 포켓몬을 잡는 찬스 웨이브!
    const isChanceWave = (Math.random() < 0.22 && emptyHoles.length >= 2);

    if (isChanceWave) {
      // 🌟 찬스 웨이브: 폭탄 없이 서로 다른 진짜 포켓몬 2~3마리 동시 출현!
      const count = Math.min(emptyHoles.length, Math.random() < 0.6 ? 3 : 2);
      const shuffled = [...emptyHoles].sort(() => 0.5 - Math.random()).slice(0, count);

      // 서로 중복되지 않도록 포켓몬 선택
      const pickedPokemon = [];
      const shuffledPokeList = [...POKEMON_LIST].sort(() => 0.5 - Math.random());
      for (let i = 0; i < count; i++) {
        pickedPokemon.push(shuffledPokeList[i % shuffledPokeList.length]);
      }

      // 최고 점수 계산
      const highestScore = Math.max(...pickedPokemon.map(p => p.score));
      this.currentWaveHighestScore = highestScore;

      // 찬스 배너 표시
      if (this.chanceBanner) {
        this.chanceBanner.classList.remove('hidden');
        clearTimeout(this.chanceBannerTimer);
        this.chanceBannerTimer = setTimeout(() => {
          if (this.chanceBanner) this.chanceBanner.classList.add('hidden');
        }, 2200);
      }

      // 찬스 차임 사운드
      try {
        soundManager.playScoreChime(10, 2);
      } catch (e) {}

      // 각각 구멍에 스폰
      shuffled.forEach((hole, idx) => {
        this.spawnHole(hole, pickedPokemon[idx], timeProgress);
      });

    } else {
      // 🎯 일반 웨이브: 잡을 수 있는 진짜 포켓몬은 정확히 1마리! 나머지는 폭탄(찌리리공/붐볼)!
      const count = Math.min(emptyHoles.length, timeProgress > 0.4 ? (Math.random() < 0.55 ? 3 : 2) : 2);
      const shuffled = [...emptyHoles].sort(() => 0.5 - Math.random()).slice(0, count);

      // 1번째 구멍: 진짜 포켓몬 1마리
      const realPoke = this.pickRandomPokemon();
      this.spawnHole(shuffled[0], realPoke, timeProgress);

      // 나머지 구멍들: 폭탄(찌리리공 / 붐볼)
      for (let i = 1; i < shuffled.length; i++) {
        const bomb = this.pickRandomBomb();
        this.spawnHole(shuffled[i], bomb, timeProgress);
      }

      this.currentWaveHighestScore = 0;
    }

    // 게임 경과에 따라 다음 스폰 간격
    const spawnDelay = Math.max(450, 950 - timeProgress * 420 + Math.random() * 200);

    this.gameLoopInterval = setTimeout(() => {
      this.scheduleNextSpawn();
    }, spawnDelay);
  }

  updateHUD() {
    this.hudScoreVal.textContent = this.score;

    // 시간 표시
    this.hudTimeVal.textContent = this.timeLeft.toFixed(1);
    const progressPercent = (this.timeLeft / this.totalGameTime) * 100;
    this.hudTimeProgress.style.width = `${progressPercent}%`;

    const isWarning = this.timeLeft <= 6.0;
    this.hudTimeVal.classList.toggle('warning', isWarning);
    this.hudTimeProgress.classList.toggle('warning', isWarning);

    // 콤보 표시
    if (this.combo >= 2) {
      this.hudComboBadge.textContent = `${this.combo} COMBO! 🔥`;
      this.hudComboBadge.classList.add('active');
    } else {
      this.hudComboBadge.classList.remove('active');
    }
  }

  endGame() {
    this.isPlaying = false;
    clearTimeout(this.gameLoopInterval);
    clearInterval(this.timerInterval);

    // 모든 구멍 리셋
    this.holes.forEach(h => this.hidePokemon(h));

    // BGM 정지 및 승리 팡파레
    try { soundManager.stopBGM(); } catch (e) {}
    try { soundManager.playVictory(); } catch (e) {}

    if (this.chanceBanner) {
      this.chanceBanner.classList.add('hidden');
    }

    // 최고 점수 갱신
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('poke_pop_highscore', this.highScore.toString());
    }

    // 결과 화면 노출
    this.showResultScreen();
  }

  showResultScreen() {
    this.resFinalScore.textContent = this.score;
    this.resHighScore.textContent = this.highScore;
    this.resCaughtCount.textContent = this.caughtCount;
    this.resMaxCombo.textContent = `${this.maxCombo}x`;

    const t = this.selectedTrainer;
    this.resTrainerAvatar.src = t.avatar;
    this.resTrainerAvatar.onerror = () => {
      this.resTrainerAvatar.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='65' x='50%' text-anchor='middle' font-size='55'>${t.fallbackAvatar}</text></svg>`;
    };
    this.resTrainerName.textContent = t.name;

    // 점수에 따른 칭호 부여
    let rankTitle = '초보 트레이너 🌱';
    if (this.score >= 200) rankTitle = '전설의 포켓몬 마스터 🏆';
    else if (this.score >= 140) rankTitle = '포켓몬 리그 챔피언 🌟';
    else if (this.score >= 90) rankTitle = '베테랑 관장급 트레이너 ⚡';
    else if (this.score >= 50) rankTitle = '실력파 트레이너 🧢';
    this.resRank.textContent = rankTitle;

    // 컨페티 축하 파티클
    this.triggerConfetti();

    this.gameScreen.classList.add('hidden');
    this.gameScreen.style.display = 'none';
    this.resultScreen.classList.remove('hidden');
    this.resultScreen.style.display = 'flex';
  }

  goToHome() {
    this.isPlaying = false;
    clearTimeout(this.gameLoopInterval);
    clearInterval(this.timerInterval);
    try { soundManager.stopBGM(); } catch (e) {}

    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
    if (this.chanceBanner) {
      this.chanceBanner.classList.add('hidden');
    }

    this.holes.forEach(h => this.hidePokemon(h));

    // 홈으로 돌아가기: 게임 화면 완전 종료 후 시작 화면 단독 표시
    this.gameScreen.classList.add('hidden');
    this.gameScreen.style.display = 'none';
    this.resultScreen.classList.add('hidden');
    this.resultScreen.style.display = 'none';
    this.startScreen.classList.remove('hidden');
    this.startScreen.style.display = 'flex';
  }

  // ==========================================
  // 파티클 시스템 (2D Canvas)
  // ==========================================
  initParticles() {
    this.particles = [];
    const loop = () => {
      this.renderParticles();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resizeCanvas() {
    const rect = document.getElementById('game-wrapper').getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  spawnParticles(x, y, color, type) {
    const wrapperRect = document.getElementById('game-wrapper').getBoundingClientRect();
    const relX = x - wrapperRect.left;
    const relY = y - wrapperRect.top;

    const count = type === 'psychic' ? 32 : 18;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      this.particles.push({
        x: relX,
        y: relY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3.5 + Math.random() * 5.5,
        color: color,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        type: type,
        spin: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * Math.PI * 2
      });
    }
  }

  triggerConfetti() {
    const colors = ['#ff3e3e', '#ffcb05', '#2a75bb', '#4caf50', '#e91e63', '#9c27b0'];
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: w * 0.5 + (Math.random() - 0.5) * 200,
        y: h * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: -6 - Math.random() * 12,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.008 + Math.random() * 0.012,
        isConfetti: true,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
  }

  renderParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.isConfetti ? 0.35 : 0.18; // 중력
      p.alpha -= p.decay;
      p.rotation += p.spin;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.isConfetti) {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      } else if (p.type === 'electric') {
        // 별모양 스파크
        this.ctx.fillStyle = '#fff59d';
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  // ==========================================
  // 이벤트 바인딩
  // ==========================================
  bindEvents() {
    this.btnStartGame.addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.initContext();
      this.startGame();
    });

    this.btnReplay.addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.initContext();
      this.startGame();
    });

    this.btnResultHome.addEventListener('click', () => {
      this.goToHome();
    });

    this.btnHome.addEventListener('click', () => {
      this.goToHome();
    });

    // 스페이스바나 엔터키로 게임 시작 지원
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !this.isPlaying && !this.rulesModal.classList.contains('active')) {
        e.preventDefault();
        soundManager.initContext();
        this.startGame();
      }
    });

    // 규칙 모달 토글
    this.btnRules.addEventListener('click', () => {
      this.rulesModal.classList.add('active');
    });
    this.btnCloseRules.addEventListener('click', () => {
      this.rulesModal.classList.remove('active');
    });
    this.rulesModal.addEventListener('click', (e) => {
      if (e.target === this.rulesModal) {
        this.rulesModal.classList.remove('active');
      }
    });

    // 사운드 토글
    const handleSoundToggle = () => {
      const isMuted = soundManager.toggleMute();
      const icon = isMuted ? '🔇' : '🔊';
      this.btnSoundToggle.textContent = icon;
      this.btnGameSoundToggle.textContent = icon;
    };

    this.btnSoundToggle.addEventListener('click', handleSoundToggle);
    this.btnGameSoundToggle.addEventListener('click', handleSoundToggle);
  }
}

// 게임 시작
window.addEventListener('DOMContentLoaded', () => {
  window.pokeGame = new PokePopGame();
});
