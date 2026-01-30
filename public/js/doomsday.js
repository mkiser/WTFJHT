/**
 * WTFJHT Government Shutdown Timer
 */
(function() {
    'use strict';

    class ShutdownTimer {
        constructor(shutdownDate) {
            this.shutdownDate = new Date(shutdownDate).getTime();
            this.interval = null;
            this.init();
        }

        init() {
            this.startTimer();
            document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
            console.log('✅ WTFJHT shutdown timer loaded!');
        }

        startTimer() {
            this.interval = setInterval(() => {
                this.updateTimer();
            }, 1000);

            // Initial update
            this.updateTimer();
        }

        updateTimer() {
            const now = new Date().getTime();
            const distance = this.shutdownDate - now;

            const timeUnits = this.calculateTimeUnits(Math.abs(distance));
            const elements = this.getElements();

            if (!elements.container) return;

            if (distance > 0) {
                this.updateCountdownMode(elements, timeUnits, distance);
            } else {
                this.updateShutdownMode(elements, timeUnits);
            }

            this.updateTimerDisplay(timeUnits);
        }

        calculateTimeUnits(absoluteDistance) {
            return {
                days: Math.floor(absoluteDistance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((absoluteDistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((absoluteDistance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((absoluteDistance % (1000 * 60)) / 1000)
            };
        }

        getElements() {
            return {
                container: document.getElementById("shutdown-container"),
                status: document.getElementById("shutdown-status"),
                impact: document.getElementById("impact-message"),
                timer: document.getElementById("doomsday")
            };
        }

        updateCountdownMode(elements, timeUnits, distance) {
            const { container, status, impact } = elements;
            const { days } = timeUnits;

            container.classList.remove("shutdown-active");
            status.innerHTML = "🚨 Gov't Shutdown Countdown 🚨";

            // Add urgency for final 24 hours
            if (distance < 24 * 60 * 60 * 1000) {
                container.classList.add("final-countdown");
            } else {
                container.classList.remove("final-countdown");
            }

            const dayText = days === 1 ? "day" : "days";
            impact.innerHTML = `Federal funding expires in&nbsp;${days}&nbsp;${dayText} unless Congress&nbsp;acts`;
        }

        updateShutdownMode(elements, timeUnits) {
            const { container, status, impact } = elements;
            const { days } = timeUnits;

            container.classList.add("shutdown-active");
            container.classList.remove("final-countdown");

            status.innerHTML = `🔥 Gov't Shutdown: Day ${days + 1} 🔥`;

            if (days === 0) {
                impact.innerHTML = "Government shutdown began&nbsp;today";
            } else {
                const dayText = (days + 1) === 1 ? "day" : "days";
                impact.innerHTML = `Your government has been shut down for ${days + 1}&nbsp;${dayText}`;
            }
        }

        updateTimerDisplay(timeUnits) {
            const { days, hours, minutes, seconds } = timeUnits;
            const timerElement = document.getElementById("doomsday");

            if (timerElement) {
                timerElement.innerHTML =
                    `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
            }
        }

        destroy() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }

        handleVisibilityChange() {
            if (document.hidden) {
                this.destroy();
            } else {
                this.startTimer();
            }
        }
    }

    // Initialize timer when DOM is ready
    function initTimer() {
        var container = document.getElementById('shutdown-container');
        if (container && container.dataset.shutdownDate) {
            new ShutdownTimer(container.dataset.shutdownDate);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimer);
    } else {
        initTimer();
    }
})();
