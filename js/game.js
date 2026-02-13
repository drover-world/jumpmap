class Game {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.gameCamera = null;
        this.player = null;
        this.world = null;
        this.ui = null;
        this.clock = new THREE.Clock();
        this.isPlaying = false;
        this.isCleared = false;

        // Selection state
        this.selectedCharacter = null;
        this.selectedMap = null;
        this.currentStep = 1;

        // Touch state
        this.isTouchDevice = false;
        this.joystickTouchId = null;
        this.joystickBaseRect = null;

        // Boss warning state
        this.bossWarningShown = false;

        this._init();
    }

    _isTouchDevice() {
        return ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
    }

    _init() {
        this.isTouchDevice = this._isTouchDevice();

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 5, 10);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 30, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x55aa55, 0.3);
        this.scene.add(hemiLight);

        // UI
        this.ui = new GameUI();

        // Setup selection flow
        this._setupSelection();

        window.addEventListener('resize', () => this._onResize());

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.isPlaying) {
                this.restart();
            }
        });

        this.ui.showStartScreen();
        this._showStep(1);

        // Start render loop
        this._animate();
    }

    _setupSelection() {
        // Character cards
        document.querySelectorAll('.char-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedCharacter = card.dataset.char;
                document.getElementById('next-to-map').disabled = false;
            });
        });

        // Map cards
        document.querySelectorAll('.map-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMap = card.dataset.map;
                document.getElementById('next-to-controls').disabled = false;
            });
        });

        // Step buttons
        document.getElementById('next-to-map').addEventListener('click', () => {
            this._showStep(2);
        });

        document.getElementById('next-to-controls').addEventListener('click', () => {
            this._showStep(3);
        });

        document.getElementById('back-to-char').addEventListener('click', () => {
            this._showStep(1);
        });

        document.getElementById('back-to-map').addEventListener('click', () => {
            this._showStep(2);
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
    }

    _showStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.selection-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${step}`).classList.add('active');
    }

    _setupTouchControls() {
        const touchControls = document.getElementById('touch-controls');
        if (!touchControls) return;

        if (this.isTouchDevice) {
            touchControls.style.display = 'block';
        } else {
            touchControls.style.display = 'none';
            return;
        }

        // Joystick
        const joystickBase = document.getElementById('joystick-base');
        const joystickThumb = document.getElementById('joystick-thumb');
        const joystickArea = document.getElementById('joystick-area');

        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.joystickTouchId !== null) return;
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            this.joystickBaseRect = joystickBase.getBoundingClientRect();
            this._updateJoystick(touch);
        }, { passive: false });

        joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickTouchId) {
                    this._updateJoystick(touch);
                }
            }
        }, { passive: false });

        const endJoystick = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    this.joystickTouchId = null;
                    joystickThumb.style.transform = 'translate(-50%, -50%)';
                    joystickThumb.style.left = '50%';
                    joystickThumb.style.top = '50%';
                    if (this.player) {
                        this.player.setTouchInput(0, 0);
                    }
                }
            }
        };
        joystickArea.addEventListener('touchend', endJoystick);
        joystickArea.addEventListener('touchcancel', endJoystick);

        // Jump button
        const jumpBtn = document.getElementById('jump-btn');
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.player) this.player.setTouchJump(true);
        }, { passive: false });

        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.player) this.player.setTouchJump(false);
        }, { passive: false });

        jumpBtn.addEventListener('touchcancel', (e) => {
            if (this.player) this.player.setTouchJump(false);
        });
    }

    _updateJoystick(touch) {
        const rect = this.joystickBaseRect;
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxRadius = rect.width / 2 - 10;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        const joystickThumb = document.getElementById('joystick-thumb');
        joystickThumb.style.left = `calc(50% + ${dx}px)`;
        joystickThumb.style.top = `calc(50% + ${dy}px)`;
        joystickThumb.style.transform = 'translate(-50%, -50%)';

        // Normalize to -1..1
        const nx = dx / maxRadius;
        const ny = dy / maxRadius;

        if (this.player) {
            // x=left/right, z=forward/back (y on screen = z in game)
            this.player.setTouchInput(nx, ny);
        }
    }

    startGame() {
        if (!this.selectedCharacter || !this.selectedMap) return;

        this._clearScene();

        this.world = new World(this.scene, this.selectedMap);
        this.player = new Player(this.scene, this.selectedCharacter);
        this.gameCamera = new GameCamera(this.camera, this.isTouchDevice);

        // Update HUD
        const charName = CHARACTER_DATA[this.selectedCharacter].name;
        const mapName = MAP_DATA[this.selectedMap].name;
        this.ui.setPlayerInfo(charName);
        this.ui.setMapInfo(mapName);

        this.ui.hideStartScreen();
        this.ui.reset();

        // Boss warning state reset
        this.bossWarningShown = false;

        // Setup touch controls
        this._setupTouchControls();

        // Show story intro
        const story = this.world.getStory();
        if (story && story.intro) {
            this.ui.showStoryIntro(story.intro, 3500);
        }

        // Start timer after intro
        setTimeout(() => {
            this.ui.startTimer();
        }, 3500);

        this.isPlaying = true;
        this.isCleared = false;

        // Request pointer lock only for desktop
        if (!this.isTouchDevice) {
            const canvas = this.renderer.domElement;
            canvas.requestPointerLock();
        }
    }

    _clearScene() {
        const toRemove = [];
        this.scene.traverse((obj) => {
            if (obj.isMesh || obj.isSprite || obj.isGroup) {
                if (obj.parent === this.scene) {
                    toRemove.push(obj);
                }
            }
        });
        for (const obj of toRemove) {
            this.scene.remove(obj);
        }
        this.scene.fog = null;
    }

    restart() {
        this.ui.hideClearScreen();
        this.isPlaying = false;
        this.isCleared = false;
        this._clearScene();
        this.scene.background = new THREE.Color(0x87ceeb);

        // Hide touch controls
        const touchControls = document.getElementById('touch-controls');
        if (touchControls) touchControls.style.display = 'none';

        this.ui.showStartScreen();
        this._showStep(1);
        document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('next-to-map').disabled = true;
        document.getElementById('next-to-controls').disabled = true;
        this.selectedCharacter = null;
        this.selectedMap = null;
        document.exitPointerLock();
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const dt = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (this.isPlaying && !this.isCleared && this.player && this.world) {
            this.world.update(time);
            this.player.update(dt, this.world.platforms, this.gameCamera.getYaw());
            this.gameCamera.update(this.player.getPosition());

            this.ui.updateTimer();
            this.ui.updateDeathCount(this.player.deathCount);

            // Check hostile NPC collision (mob/boss)
            const hitNPC = this.world.checkNPCCollision(this.player.getPosition());
            if (hitNPC) {
                this.ui.showNPCNotification(hitNPC);
                this.player.die();
            }

            // Check rescue collision
            const rescuedName = this.world.checkRescueCollision(this.player.getPosition());
            if (rescuedName) {
                this.ui.showRescueNotification(rescuedName);
            }

            // Boss warning (when player gets close)
            if (!this.bossWarningShown && this.world.bossNpc) {
                const bossPos = this.world.getBossPosition();
                if (bossPos) {
                    const playerPos = this.player.getPosition();
                    const dist = Math.sqrt(
                        Math.pow(playerPos.x - bossPos.x, 2) +
                        Math.pow(playerPos.z - bossPos.z, 2)
                    );
                    if (dist < 25) {
                        this.bossWarningShown = true;
                        this.ui.showBossWarning(this.world.bossNpc.name);
                    }
                }
            }

            // Check checkpoints
            const cp = this.world.checkCheckpoints(this.player.getPosition());
            if (cp) {
                const isNew = this.player.setCheckpoint(cp.position, cp.index);
                if (isNew) {
                    this.ui.showCheckpointNotification(cp.index);
                    this.ui.updateCheckpointInfo(cp.index, this.world.checkpoints.length);
                }
            }

            // Check goal
            if (this.world.checkGoal(this.player.getPosition())) {
                this.isCleared = true;
                const story = this.world.getStory();
                this.ui.showClearScreen(
                    this.ui.elapsedTime,
                    this.player.deathCount,
                    story ? story.clearMsg : '',
                    this.world.rescuedCount
                );
                document.exitPointerLock();
            }
        } else if (this.player && this.gameCamera) {
            this.gameCamera.update(this.player.getPosition());
            if (this.world) this.world.update(time);
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
