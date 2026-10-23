// 포켓몬 팡팡! - Web Audio API 사운드 엔진
// 외부 파일 다운로드 없이 순수 브라우저 오디오 신시사이징으로 구현

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
  }

  // 첫 사용자 인터랙션 시 오디오 컨텍스트 초기화
  initContext() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();

        // 마스터 게인 노드
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // 효과음 전용 게인
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // BGM 전용 게인
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.initContext();
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // ==========================================
  // 망치 및 기본 시스템 사운드
  // ==========================================

  // 망치 휘두르기 (Whoosh)
  playHammerSwing() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 노이즈 버퍼 생성 (바람 가르는 소리)
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  // 망치 타격음 (Whack)
  playHammerHit() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. 임팩트 펀치 톤
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);

    // 2. 뿅망치 팝 사운드
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(650, now);
    popOsc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    popGain.gain.setValueAtTime(0.6, now);
    popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);

    popOsc.start(now);
    popOsc.stop(now + 0.08);
  }

  // 빗맞춤 사운드 (Miss)
  playMiss() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 점수 획득 코인 챠임
  playScoreChime(points = 3, combo = 1) {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const baseFreq = 587.33 + Math.min(combo * 40, 400); // 콤보마다 상승
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.setValueAtTime(baseFreq * 1.5, now + 0.06);

    osc2.frequency.setValueAtTime(baseFreq * 2, now);
    osc2.frequency.setValueAtTime(baseFreq * 3, now + 0.06);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  // ==========================================
  // 포켓몬 9종별 고유 합성 사운드
  // ==========================================

  // 1. 피카츄: 전기 지지직 + 찌릿 스파크 FM 신스
  playPikachu() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 모듈레이터와 캐리어로 지지직거리는 전기 톤 합성
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(880, now); // A5
    carrier.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    carrier.frequency.exponentialRampToValueAtTime(1760, now + 0.16);

    mod.type = 'square';
    mod.frequency.setValueAtTime(80, now); // 지지직 스파크 진동
    modGain.gain.setValueAtTime(400, now);

    mod.connect(carrier.frequency);

    masterGain.gain.setValueAtTime(0.5, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    carrier.connect(masterGain);
    masterGain.connect(this.sfxGain);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.28);
    carrier.stop(now + 0.28);
  }

  // 2. 이브이: 맑고 통통 튀는 귀여운 크리스탈 아르페지오 (도-미-솔-도)
  playEevee() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // 3. 파이리: 화염 슛 & 폭발 스윕 사운드 (불꽃)
  playCharmander() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 톱니파 피치 드롭
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    // 노이즈 버스트 필터 스윕
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.25);
    noise.stop(now + 0.25);
  }

  // 4. 꼬부기: 물방울 '퐁당~' 팝핑 사운드 (사인파 피치 슬라이드)
  playSquirtle() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 버블 1차
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(380, now);
    osc1.frequency.exponentialRampToValueAtTime(950, now + 0.12);

    gain1.gain.setValueAtTime(0.65, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    osc1.start(now);
    osc1.stop(now + 0.16);

    // 버블 2차 (작은 물방울)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const t2 = now + 0.08;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(620, t2);
    osc2.frequency.exponentialRampToValueAtTime(1400, t2 + 0.1);

    gain2.gain.setValueAtTime(0.4, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc2.start(t2);
    osc2.stop(t2 + 0.12);
  }

  // 5. 이상해씨: 덩굴 채찍 휙+상쾌한 풀잎 사운드
  playBulbasaur() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.07);
    osc.frequency.linearRampToValueAtTime(260, now + 0.18);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 6. 푸린: 몽환적이고 귀여운 멜로디 (솔-도-미-레♪)
  playJigglypuff() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const melody = [783.99, 1046.50, 1318.51, 1174.66]; // G5, C6, E6, D6

    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // 비브라토 효과
      const vibrato = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vibrato.frequency.value = 12;
      vibGain.gain.value = 15;
      vibrato.connect(osc.frequency);
      vibrato.start(t);
      vibrato.stop(t + 0.18);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // 7. 고라파덕: 꽥꽥 코믹한 쿼크 사운드 (디스토션 사각파 삑삑)
  playPsyduck() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    // 꽥~ 꽥 피치 굴곡
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.06);
    osc.frequency.linearRampToValueAtTime(320, now + 0.16);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 8. 잠만보: 묵직한 서브 베이스 쿵! & 늘어지는 하품
  playSnorlax() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // 저음 쿵
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  // 9. 뮤: 신비롭고 영롱한 마법 펜타토닉 벨 (초희귀 환상)
  playMew() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [1046.50, 1318.51, 1567.98, 2093.00, 2637.02]; // C6, E6, G6, C7, E7

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.045;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  // 10. 찌리리공 대폭발 (Bomb Explosion)
  playBombExplosion() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // 1. 거대한 서브 베이스 쿵
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

      subGain.gain.setValueAtTime(0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);
      subOsc.start(now);
      subOsc.stop(now + 0.45);

      // 2. 폭발 화염 노이즈 버스트
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.5);
    } catch (e) {
      console.warn(e);
    }
  }

  // 포켓몬 사운드 통합 디스패처
  playPokemonCry(soundType) {
    this.initContext();
    switch (soundType) {
      case 'pikachu': this.playPikachu(); break;
      case 'eevee': this.playEevee(); break;
      case 'bulbasaur': this.playBulbasaur(); break;
      case 'squirtle': this.playSquirtle(); break;
      case 'charmander': this.playCharmander(); break;
      case 'jigglypuff': this.playJigglypuff(); break;
      case 'psyduck': this.playPsyduck(); break;
      case 'snorlax': this.playSnorlax(); break;
      case 'mew': this.playMew(); break;
      case 'bomb': this.playBombExplosion(); break;
      default: this.playScoreChime(); break;
    }
  }

  // 3, 2, 1 카운트다운 비프음
  playCountdownBeep(num) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (num === 0) {
        // START! 팡파레
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(1046.50, now + 0.08);
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // 3, 2, 1 삐~
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550 + (3 - num) * 120, now);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // 카운트다운 틱
  playTick(isFinal = false) {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 게임 오버 팡파레
  playVictory() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.12 }, // C
      { f: 659.25, d: 0.12 }, // E
      { f: 783.99, d: 0.12 }, // G
      { f: 1046.50, d: 0.35 } // High C
    ];

    let t = now;
    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.9;
    });
  }

  // ==========================================
  // 경쾌한 포켓몬 배틀풍 8비트 치프튠 BGM 신시사이저
  // ==========================================
  startBGM() {
    this.initContext();
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // 밝고 경쾌한 16비트 포켓몬 루트풍 베이스 & 멜로디 루프
    const tempo = 148; // BPM
    const stepDuration = 60 / tempo / 2; // 8분음표/16분음표 단위

    // 멜로디 음계 (Hz)
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99;
    const C3 = 130.81, G3 = 196.00, A3 = 220.00, F3 = 174.61;

    const melodySeq = [
      C5, G4, E4, G4, C5, D5, E5, G5,
      F4, A4, C5, F4, G4, B4, D5, G4,
      A4, C5, E5, A4, G4, B4, D5, G4,
      F4, A4, D5, F4, G4, D5, G5, 0
    ];

    const bassSeq = [
      C3, C3, G3, C3, C3, C3, G3, C3,
      F3, F3, C3, F3, G3, G3, D4, G3,
      A3, A3, E3, A3, G3, G3, D3, G3,
      F3, F3, C3, F3, G3, G3, G3, G3
    ];

    const playStep = () => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) {
        if (this.bgmPlaying) {
          this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
        }
        return;
      }

      const now = this.ctx.currentTime;
      const mNote = melodySeq[this.bgmStep % melodySeq.length];
      const bNote = bassSeq[this.bgmStep % bassSeq.length];

      // 멜로디 (펄스/구형파 느낌의 귀여운 칩튠)
      if (mNote > 0) {
        const mOsc = this.ctx.createOscillator();
        const mGain = this.ctx.createGain();
        mOsc.type = 'square';
        mOsc.frequency.setValueAtTime(mNote, now);

        mGain.gain.setValueAtTime(0.09, now);
        mGain.gain.exponentialRampToValueAtTime(0.005, now + stepDuration * 0.85);

        mOsc.connect(mGain);
        mGain.connect(this.bgmGain);

        mOsc.start(now);
        mOsc.stop(now + stepDuration * 0.85);
      }

      // 베이스라인 (삼각파 베이스)
      if (bNote > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bNote, now);

        bGain.gain.setValueAtTime(0.18, now);
        bGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration * 0.95);

        bOsc.connect(bGain);
        bGain.connect(this.bgmGain);

        bOsc.start(now);
        bOsc.stop(now + stepDuration * 0.95);
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
