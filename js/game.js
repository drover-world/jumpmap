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

        // Ending state
        this.endingActive = false;
        this.endingObjects = [];
        this.endingStartTime = 0;

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
                const mapId = card.dataset.map;
                const mapInfo = MAP_DATA[mapId];
                // 역삼동은 서현/서준만 선택 가능
                if (mapInfo.allowedChars && !mapInfo.allowedChars.includes(this.selectedCharacter)) {
                    const charName = CHARACTER_DATA[this.selectedCharacter].name;
                    const allowed = mapInfo.allowedChars.map(c => CHARACTER_DATA[c].name).join(', ');
                    alert(`${charName}(은)는 ${mapInfo.name}에 갈 수 없어!\n${allowed}만 갈 수 있어!`);
                    return;
                }
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMap = mapId;
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

        // Show story intro (character-specific)
        const story = this.world.getStory();
        const charData = CHARACTER_DATA[this.selectedCharacter];
        if (story && story.getIntro) {
            this.ui.showStoryIntro(story.getIntro(charData), 5000);
        }

        // Start timer after intro
        setTimeout(() => {
            this.ui.startTimer();
        }, 5000);

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
        this.endingActive = false;
        this.endingObjects = [];
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
                this._startEnding();
                document.exitPointerLock();
            }
        } else if (this.endingActive) {
            // Ending animation loop
            this._updateEnding(time);
            if (this.gameCamera) this.gameCamera.update(this.player.getPosition());
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

    // ===== ENDING SYSTEM =====
    _startEnding() {
        this.endingActive = true;
        this.endingStartTime = this.clock.getElapsedTime();
        this.endingObjects = [];

        const story = this.world.getStory();
        const ending = story.ending;
        const goalPos = this.world.goalPlatform.mesh.position.clone();

        if (ending === 'fart') {
            this._endingFart(goalPos);
        } else if (ending === 'dance') {
            this._endingDance(goalPos);
        } else if (ending === 'grandma') {
            this._endingGrandma(goalPos);
        }

        // Show clear screen after 5 seconds
        setTimeout(() => {
            this.endingActive = false;
            const cd = CHARACTER_DATA[this.selectedCharacter];
            const clearMsg = (story && story.getClearMsg) ? story.getClearMsg(cd) : '';
            this.ui.showClearScreen(
                this.ui.elapsedTime,
                this.player.deathCount,
                clearMsg,
                this.world.rescuedCount
            );
        }, 5000);
    }

    _makeEndingNPC(color, name, x, y, z) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 0.45);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        group.add(new THREE.Mesh(bodyGeo, bodyMat));

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.13, 0.75, 0.31);
        group.add(lEye);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.13, 0.75, 0.31);
        group.add(rEye);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.3);
        const armMat = new THREE.MeshLambertMaterial({ color });
        const lArm = new THREE.Mesh(armGeo, armMat);
        lArm.position.set(-0.46, 0, 0);
        group.add(lArm);
        const rArm = new THREE.Mesh(armGeo, armMat);
        rArm.position.set(0.46, 0, 0);
        group.add(rArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 0.7, 0.4);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        const lLeg = new THREE.Mesh(legGeo, legMat);
        lLeg.position.set(-0.18, -0.75, 0);
        group.add(lLeg);
        const rLeg = new THREE.Mesh(legGeo, legMat);
        rLeg.position.set(0.18, -0.75, 0);
        group.add(rLeg);

        // Name tag
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 8, 256, 48);
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(name, 128, 44);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sprite.scale.set(1.5, 0.4, 1);
        sprite.position.y = 1.5;
        group.add(sprite);

        group.position.set(x, y, z);
        this.scene.add(group);
        return { group, lArm, rArm, lLeg, rLeg };
    }

    _makeTextSprite(text, color, size) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = `bold ${size || 60}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = color || '#fff';
        ctx.fillText(text, 256, 80);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    // 삼성동: 큰이모 방구
    _endingFart(goalPos) {
        const npc = this._makeEndingNPC(0xe74c3c, '큰이모', goalPos.x, goalPos.y + 1.5, goalPos.z + 2);
        this.endingObjects.push({ type: 'fart_npc', ...npc, phase: 0 });

        // "뿌웅~" text
        const txt = this._makeTextSprite('뿌웅~💨', '#8BC34A', 70);
        txt.position.set(goalPos.x, goalPos.y + 4, goalPos.z + 2);
        txt.visible = false;
        this.scene.add(txt);
        this.endingObjects.push({ type: 'fart_text', sprite: txt });

        // Fart clouds (green spheres)
        for (let i = 0; i < 8; i++) {
            const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0x8BC34A, transparent: true, opacity: 0.6 });
            const cloud = new THREE.Mesh(geo, mat);
            cloud.position.set(goalPos.x + (Math.random() - 0.5) * 2, goalPos.y + 1, goalPos.z + 2 - 0.5);
            cloud.visible = false;
            this.scene.add(cloud);
            this.endingObjects.push({ type: 'fart_cloud', mesh: cloud, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2, vz: -(Math.random() * 2 + 1) });
        }

        this.ui.showStoryIntro('큰이모가 갑자기...\n뿌웅~💨', 4000);
    }

    // 역삼동: 명태+재우 춤
    _endingDance(goalPos) {
        const npc1 = this._makeEndingNPC(0xe67e22, '명태', goalPos.x - 1.5, goalPos.y + 1.5, goalPos.z + 2);
        const npc2 = this._makeEndingNPC(0x3498db, '김재우', goalPos.x + 1.5, goalPos.y + 1.5, goalPos.z + 2);
        this.endingObjects.push({ type: 'dance_npc', ...npc1, id: 1 });
        this.endingObjects.push({ type: 'dance_npc', ...npc2, id: 2 });

        // Music notes
        const notes = ['♪', '♫', '♬', '♩'];
        for (let i = 0; i < 4; i++) {
            const txt = this._makeTextSprite(notes[i], '#FFD700', 50);
            txt.position.set(goalPos.x + (i - 1.5) * 1.5, goalPos.y + 4, goalPos.z + 2);
            txt.visible = false;
            this.scene.add(txt);
            this.endingObjects.push({ type: 'dance_note', sprite: txt, offset: i * 0.5 });
        }

        this.ui.showStoryIntro('명태와 김재우가\n신나게 춤을 춘다! 💃🕺', 4000);
    }

    // 대치동: 대치동할미 밥
    _endingGrandma(goalPos) {
        // Grandma NPC (gray hair)
        const grp = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 0.45);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
        grp.add(new THREE.Mesh(bodyGeo, bodyMat));
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        grp.add(head);
        // Gray hair
        const hairGeo = new THREE.BoxGeometry(0.63, 0.18, 0.63);
        const hairMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.05;
        grp.add(hair);
        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.13, 0.75, 0.31);
        grp.add(lEye);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.13, 0.75, 0.31);
        grp.add(rEye);
        // Smile
        const smileGeo = new THREE.BoxGeometry(0.25, 0.05, 0.05);
        const smileMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.position.set(0, 0.62, 0.31);
        grp.add(smile);
        // Arms
        const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.3);
        const armMat = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
        const lArm = new THREE.Mesh(armGeo, armMat);
        lArm.position.set(-0.46, 0, 0);
        grp.add(lArm);
        const rArm = new THREE.Mesh(armGeo, armMat);
        rArm.position.set(0.46, 0, 0);
        grp.add(rArm);

        // Name tag
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 8, 256, 48);
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('대치동할미', 128, 44);
        const tex = new THREE.CanvasTexture(canvas);
        const ns = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        ns.scale.set(1.5, 0.4, 1);
        ns.position.y = 1.5;
        grp.add(ns);

        grp.position.set(goalPos.x, goalPos.y + 1.5, goalPos.z + 2);
        this.scene.add(grp);
        this.endingObjects.push({ type: 'grandma', group: grp, lArm, rArm });

        // Rice bowls (white bowls)
        for (let i = 0; i < 2; i++) {
            const bowlGroup = new THREE.Group();
            const bowlGeo = new THREE.CylinderGeometry(0.25, 0.15, 0.15, 8);
            const bowlMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
            bowlGroup.add(new THREE.Mesh(bowlGeo, bowlMat));
            // Rice
            const riceGeo = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            const riceMat = new THREE.MeshLambertMaterial({ color: 0xfffef0 });
            const rice = new THREE.Mesh(riceGeo, riceMat);
            rice.position.y = 0.08;
            bowlGroup.add(rice);

            bowlGroup.position.set(goalPos.x + (i === 0 ? -1 : 1), goalPos.y + 1, goalPos.z + 3.5);
            bowlGroup.visible = false;
            this.scene.add(bowlGroup);
            this.endingObjects.push({ type: 'bowl', group: bowlGroup, target: i });
        }

        // "밥 먹자~" text
        const txt = this._makeTextSprite('밥 먹자~ 🍚', '#FFD700', 60);
        txt.position.set(goalPos.x, goalPos.y + 4, goalPos.z + 2);
        txt.visible = false;
        this.scene.add(txt);
        this.endingObjects.push({ type: 'grandma_text', sprite: txt });

        // Ian + Iseo NPCs sitting
        const ian = this._makeEndingNPC(0x9b59b6, '이안', goalPos.x - 1, goalPos.y + 1.5, goalPos.z + 3.5);
        const iseo = this._makeEndingNPC(0xff69b4, '이서', goalPos.x + 1, goalPos.y + 1.5, goalPos.z + 3.5);
        this.endingObjects.push({ type: 'eat_npc', ...ian, id: 1 });
        this.endingObjects.push({ type: 'eat_npc', ...iseo, id: 2 });

        this.ui.showStoryIntro('대치동할미가 나타났다!\n"이안아, 이서야, 밥 먹자~" 🍚', 4000);
    }

    _updateEnding(time) {
        const elapsed = time - this.endingStartTime;

        for (const obj of this.endingObjects) {
            if (obj.type === 'fart_npc') {
                // Shake animation
                obj.group.rotation.y = Math.sin(time * 5) * 0.2;
                obj.group.position.y += Math.sin(time * 3) * 0.002;
            }
            if (obj.type === 'fart_text') {
                if (elapsed > 1.5) {
                    obj.sprite.visible = true;
                    obj.sprite.scale.set(4 + Math.sin(time * 3) * 0.5, 1 + Math.sin(time * 3) * 0.1, 1);
                }
            }
            if (obj.type === 'fart_cloud') {
                if (elapsed > 1.5) {
                    obj.mesh.visible = true;
                    const t = elapsed - 1.5;
                    obj.mesh.position.x += obj.vx * 0.01;
                    obj.mesh.position.y += obj.vy * 0.008;
                    obj.mesh.position.z += obj.vz * 0.008;
                    obj.mesh.material.opacity = Math.max(0, 0.6 - t * 0.1);
                    obj.mesh.scale.setScalar(1 + t * 0.3);
                }
            }
            if (obj.type === 'dance_npc') {
                // Dance animation
                const offset = obj.id * Math.PI;
                obj.group.position.y += Math.sin(time * 6 + offset) * 0.01;
                obj.group.rotation.y = Math.sin(time * 3 + offset) * 0.8;
                obj.lArm.rotation.x = Math.sin(time * 6 + offset) * 1.2;
                obj.rArm.rotation.x = Math.sin(time * 6 + offset + 1) * 1.2;
                obj.lArm.rotation.z = Math.sin(time * 4) * 0.5 - 0.3;
                obj.rArm.rotation.z = -Math.sin(time * 4) * 0.5 + 0.3;
                obj.lLeg.rotation.x = Math.sin(time * 6 + offset) * 0.6;
                obj.rLeg.rotation.x = -Math.sin(time * 6 + offset) * 0.6;
            }
            if (obj.type === 'dance_note') {
                if (elapsed > 0.5) {
                    obj.sprite.visible = true;
                    const t = elapsed - 0.5 + obj.offset;
                    obj.sprite.position.y += Math.sin(time * 2 + obj.offset * 2) * 0.01;
                    obj.sprite.material.opacity = 0.5 + Math.sin(time * 3 + obj.offset) * 0.5;
                }
            }
            if (obj.type === 'grandma') {
                obj.lArm.rotation.x = Math.sin(time * 3) * 0.4;
                obj.rArm.rotation.x = Math.sin(time * 3 + 1) * 0.4;
            }
            if (obj.type === 'grandma_text') {
                if (elapsed > 1) {
                    obj.sprite.visible = true;
                    obj.sprite.scale.set(4 + Math.sin(time * 2) * 0.3, 1, 1);
                }
            }
            if (obj.type === 'bowl') {
                if (elapsed > 1.5) {
                    obj.group.visible = true;
                    obj.group.position.y += Math.sin(time * 2 + obj.target) * 0.002;
                }
            }
            if (obj.type === 'eat_npc') {
                // Nodding (eating) animation
                if (elapsed > 1.5) {
                    const head = obj.group.children[1]; // head
                    if (head) head.rotation.x = Math.sin(time * 5) * 0.2;
                }
            }
        }

        if (this.world) this.world.update(time);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
