class GameUI {
    constructor() {
        this.timerEl = document.getElementById('timer');
        this.checkpointInfoEl = document.getElementById('checkpoint-info');
        this.deathCountEl = document.getElementById('death-count');
        this.mapInfoEl = document.getElementById('map-info');
        this.playerInfoEl = document.getElementById('player-info');
        this.centerMessage = document.getElementById('center-message');
        this.checkpointNotification = document.getElementById('checkpoint-notification');
        this.npcNotification = document.getElementById('npc-notification');
        this.rescueNotification = document.getElementById('rescue-notification');
        this.bossWarning = document.getElementById('boss-warning');
        this.storyDialog = document.getElementById('story-dialog');
        this.storyText = document.getElementById('story-text');
        this.startScreen = document.getElementById('start-screen');
        this.clearScreen = document.getElementById('clear-screen');
        this.clearTimeEl = document.getElementById('clear-time');
        this.clearDeathsEl = document.getElementById('clear-deaths');
        this.clearStoryMsg = document.getElementById('clear-story-msg');
        this.clearRescueCount = document.getElementById('clear-rescue-count');

        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.notificationTimeout = null;
        this.npcNotificationTimeout = null;
        this.rescueNotificationTimeout = null;
        this.bossWarningTimeout = null;
    }

    startTimer() {
        this.startTime = performance.now();
        this.isRunning = true;
    }

    updateTimer() {
        if (!this.isRunning) return;
        this.elapsedTime = (performance.now() - this.startTime) / 1000;
        const min = Math.floor(this.elapsedTime / 60);
        const sec = Math.floor(this.elapsedTime % 60);
        const ms = Math.floor((this.elapsedTime % 1) * 100);
        this.timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    }

    stopTimer() {
        this.isRunning = false;
    }

    setMapInfo(name) {
        this.mapInfoEl.textContent = name;
    }

    setPlayerInfo(name) {
        this.playerInfoEl.textContent = name;
    }

    updateCheckpointInfo(index, total) {
        this.checkpointInfoEl.textContent = `CP: ${index}/${total}`;
    }

    updateDeathCount(count) {
        this.deathCountEl.textContent = `Deaths: ${count}`;
    }

    showCheckpointNotification(index) {
        this.checkpointNotification.textContent = `Checkpoint ${index} !`;
        this.checkpointNotification.classList.add('show');
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            this.checkpointNotification.classList.remove('show');
        }, 2000);
    }

    showNPCNotification(npcName) {
        this.npcNotification.textContent = `${npcName}에게 잡혔다!`;
        this.npcNotification.classList.add('show');
        if (this.npcNotificationTimeout) clearTimeout(this.npcNotificationTimeout);
        this.npcNotificationTimeout = setTimeout(() => {
            this.npcNotification.classList.remove('show');
        }, 1500);
    }

    showRescueNotification(name) {
        this.rescueNotification.textContent = `${name}을(를) 구출했다!`;
        this.rescueNotification.classList.add('show');
        if (this.rescueNotificationTimeout) clearTimeout(this.rescueNotificationTimeout);
        this.rescueNotificationTimeout = setTimeout(() => {
            this.rescueNotification.classList.remove('show');
        }, 2000);
    }

    showBossWarning(bossName) {
        this.bossWarning.textContent = `${bossName} 출현!`;
        this.bossWarning.classList.add('show');
        if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
        this.bossWarningTimeout = setTimeout(() => {
            this.bossWarning.classList.remove('show');
        }, 2000);
    }

    showStoryIntro(text, duration) {
        this.storyText.textContent = text;
        this.storyDialog.classList.add('show');
        setTimeout(() => {
            this.storyDialog.classList.remove('show');
        }, duration || 3000);
    }

    showStartScreen() {
        this.startScreen.style.display = 'flex';
        this.clearScreen.classList.remove('show');
    }

    hideStartScreen() {
        this.startScreen.style.display = 'none';
    }

    showClearScreen(time, deaths, storyMsg, rescuedCount) {
        this.stopTimer();
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        this.clearTimeEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
        this.clearDeathsEl.textContent = deaths;
        if (storyMsg) {
            this.clearStoryMsg.textContent = storyMsg;
        }
        if (rescuedCount > 0) {
            this.clearRescueCount.textContent = `구출: ${rescuedCount}명`;
        }
        this.clearScreen.classList.add('show');
    }

    hideClearScreen() {
        this.clearScreen.classList.remove('show');
        this.clearStoryMsg.textContent = '';
        this.clearRescueCount.textContent = '';
    }

    reset() {
        this.elapsedTime = 0;
        this.isRunning = false;
        this.timerEl.textContent = '00:00.00';
        this.checkpointInfoEl.textContent = 'CP: 0/4';
        this.deathCountEl.textContent = 'Deaths: 0';
        this.hideClearScreen();
    }
}
