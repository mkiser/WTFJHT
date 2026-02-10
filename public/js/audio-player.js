// Minimal audio player - lazy loaded on first click
(function() {
  const trigger = document.querySelector('.audio-player__trigger');
  const bar = document.querySelector('.audio-player__bar');

  if (!trigger || !bar) return;

  const audioSrc = trigger.dataset.audioSrc;
  const playPauseBtn = bar.querySelector('.audio-player__playpause');
  const progressContainer = bar.querySelector('.audio-player__progress');
  const progressFill = bar.querySelector('.audio-player__progress-fill');
  const currentTimeEl = bar.querySelector('.audio-player__current');
  const remainingTimeEl = bar.querySelector('.audio-player__remaining');

  // Create audio element
  const audio = new Audio(audioSrc);
  audio.preload = 'metadata';

  let isPlaying = false;

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function updateProgress() {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
    remainingTimeEl.textContent = '-' + formatTime(audio.duration - audio.currentTime);
  }

  var playIcon = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var pauseIcon = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  var playIconSmall = '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var pauseIconSmall = '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  function play() {
    audio.play();
    isPlaying = true;
    trigger.classList.add('is-playing');
    trigger.innerHTML = pauseIcon + ' Listen';
    bar.classList.remove('is-closing');
    bar.classList.add('is-open');
    playPauseBtn.innerHTML = pauseIconSmall;
    playPauseBtn.setAttribute('aria-label', 'Pause');
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    trigger.classList.remove('is-playing');
    trigger.innerHTML = playIcon + ' Listen';
    bar.classList.add('is-closing');
    playPauseBtn.innerHTML = playIconSmall;
    playPauseBtn.setAttribute('aria-label', 'Play');

    // Wait for animation to finish, then hide
    bar.addEventListener('animationend', function handler() {
      if (!isPlaying) {
        bar.classList.remove('is-open', 'is-closing');
      }
      bar.removeEventListener('animationend', handler);
    });
  }

  function toggle() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  // Event listeners
  trigger.addEventListener('click', toggle);
  playPauseBtn.addEventListener('click', toggle);

  audio.addEventListener('timeupdate', updateProgress);

  audio.addEventListener('ended', function() {
    pause();
    audio.currentTime = 0;
    updateProgress();
  });

  audio.addEventListener('loadedmetadata', function() {
    remainingTimeEl.textContent = '-' + formatTime(audio.duration);
  });

  // Click to seek
  progressContainer.addEventListener('click', function(e) {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
    updateProgress();
  });

  // Start playing immediately since user clicked
  play();
})();
