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
            this.destroy();
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
            } else if (distance <= 0 && elements.container.dataset.shutdownActive === "true") {
                // Counting UP into a shutdown requires explicit opt-in
                // (data-shutdown-active="true") — a stale config date must
                // never broadcast a false running shutdown.
                this.updateShutdownMode(elements, timeUnits);
            } else {
                elements.container.style.display = "none";
                this.destroy();
                return;
            }

            this.updateTimerDisplay(timeUnits);
            elements.container.classList.add("is-running");
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
                impact: document.getElementById("impact-message")
            };
        }

        plural(count, unit) {
            return `${count}&nbsp;${unit}${count === 1 ? "" : "s"}`;
        }

        span(timeUnits) {
            const { days, hours, minutes } = timeUnits;
            if (days > 0) return this.plural(days, "day");
            return hours > 0 ? this.plural(hours, "hour") : this.plural(Math.max(minutes, 1), "minute");
        }

        updateCountdownMode(elements, timeUnits, distance) {
            const { container, status, impact } = elements;
            const { days } = timeUnits;
            const span = this.span(timeUnits);

            container.classList.remove("shutdown-active");

            // Add urgency for final 24 hours
            if (distance < 24 * 60 * 60 * 1000) {
                container.classList.add("final-countdown");
            } else {
                container.classList.remove("final-countdown");
            }

            this.setLine(status, container.dataset.label, span, days);
            this.setLine(impact, container.dataset.message, span, days);
        }

        updateShutdownMode(elements, timeUnits) {
            const { container, status, impact } = elements;
            const day = timeUnits.days + 1;
            const span = this.span(timeUnits);

            container.classList.add("shutdown-active");
            container.classList.remove("final-countdown");

            this.setLine(status, container.dataset.afterLabel, span, day);
            this.setLine(impact, container.dataset.afterMessage, span, day);
        }

        setLine(element, template, span, day) {
            const line = (template || "")
                .replace(/\{days\}/g, span)
                .replace(/\{day\}/g, day);

            element.hidden = !line;
            if (element.dataset.line !== line) {
                element.dataset.line = line;
                element.innerHTML = line;
            }
        }

        updateTimerDisplay(timeUnits) {
            const { days, hours, minutes, seconds } = timeUnits;
            const pad = (n) => n.toString().padStart(2, "0");
            const set = (id, text) => {
                const el = document.getElementById(id);
                if (el && el.textContent !== text) el.textContent = text;
            };

            document.getElementById("clock-days-unit").hidden = days === 0;
            set("clock-days", String(days));
            set("clock-days-cap", days === 1 ? "day" : "days");
            set("clock-hours", pad(hours));
            set("clock-hours-cap", hours === 1 ? "hr" : "hrs");
            set("clock-minutes", pad(minutes));
            set("clock-seconds", pad(seconds));
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
