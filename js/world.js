const NPC_ROSTER = {
    myeongtae: { name: '명태', bodyColor: 0xe67e22, hairColor: 0xd35400 },
    keunimo: { name: '큰이모', bodyColor: 0xe74c3c, hairColor: 0xc0392b },
    haha: { name: '하하', bodyColor: 0xf1c40f, hairColor: 0xf39c12 },
    ian: { name: '이안', bodyColor: 0x9b59b6, hairColor: 0x8e44ad },
    iseo: { name: '이서', bodyColor: 0xff69b4, hairColor: 0xe91e63 },
    jaewoo: { name: '김재우', bodyColor: 0x3498db, hairColor: 0x2c3e50 },
};

const MAP_DATA = {
    samsung: {
        name: '삼성동',
        skyColor: 0x87ceeb,
        fogColor: 0x87ceeb,
        groundColor: 0x888888,
        theme: 'city',
        story: {
            bossKey: 'keunimo',
            mobKeys: ['haha', 'myeongtae'],
            rescueKeys: ['ian', 'iseo'],
            getIntro: (charData) => {
                return `[${charData.school}] ${charData.name} 출동!\n\n큰이모가 삼성동에서\n이안이와 이서를 잡아갔다!\n\n${charData.intro}\n친척동생들을 구하러 가자!`;
            },
            getClearMsg: (charData) => {
                return `${charData.name}(이)가 이안이와 이서를 구출했다!`;
            },
        },
    },
    yeoksam: {
        name: '역삼동',
        skyColor: 0x90ee90,
        fogColor: 0xa8d8a8,
        groundColor: 0x55aa55,
        theme: 'park',
        story: {
            bossKey: 'myeongtae',
            mobKeys: ['keunimo', 'haha'],
            rescueKeys: ['jaewoo'],
            getIntro: (charData) => {
                return `[${charData.school}] ${charData.name} 출동!\n\n명태이모가 역삼동 공원에서\n김재우를 잡아갔다!\n\n${charData.intro}\n재우를 구하러 가자!`;
            },
            getClearMsg: (charData) => {
                return `${charData.name}(이)가 김재우를 구출했다!`;
            },
        },
    },
    daechi: {
        name: '대치동',
        skyColor: 0xdda0dd,
        fogColor: 0xdda0dd,
        groundColor: 0x9988aa,
        theme: 'academy',
        story: {
            bossKey: 'haha',
            mobKeys: ['keunimo', 'myeongtae'],
            rescueKeys: ['ian', 'iseo'],
            getIntro: (charData) => {
                return `[${charData.school}] ${charData.name} 출동!\n\n하하가 대치동 학원가에서\n이안이와 이서를 잡아갔다!\n\n${charData.intro}\n친척동생들을 구하러 가자!`;
            },
            getClearMsg: (charData) => {
                return `${charData.name}(이)가 이안이와 이서를 구출했다!`;
            },
        },
    },
};

class World {
    constructor(scene, mapId) {
        this.scene = scene;
        this.mapId = mapId || 'samsung';
        this.mapData = MAP_DATA[this.mapId];
        this.platforms = [];
        this.checkpoints = [];
        this.movingPlatforms = [];
        this.goalPlatform = null;
        this.npcs = [];         // mobs + boss (hostile)
        this.rescueNpcs = [];   // rescue targets (friendly)
        this.rescuedCount = 0;
        this.bossNpc = null;

        this._buildMap();
    }

    getStory() {
        return this.mapData.story;
    }

    _addPlatform(x, y, z, w, h, d, color, isCheckpoint = false, isGoal = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const platData = {
            mesh,
            box: {
                minX: x - w / 2, maxX: x + w / 2,
                minY: y - h / 2, maxY: y + h / 2,
                minZ: z - d / 2, maxZ: z + d / 2,
            },
            isCheckpoint, isGoal, isMoving: false,
        };

        this.platforms.push(platData);

        if (isCheckpoint) {
            this.checkpoints.push({
                position: new THREE.Vector3(x, y + h / 2, z),
                index: this.checkpoints.length + 1,
            });
            this._addCheckpointMarker(x, y + h / 2, z, w, d);
        }

        if (isGoal) {
            this.goalPlatform = platData;
            this._addGoalMarker(x, y + h / 2, z);
        }

        return platData;
    }

    _addMovingPlatform(x, y, z, w, h, d, color, moveAxis, moveRange, moveSpeed) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const platData = {
            mesh,
            box: {
                minX: x - w / 2, maxX: x + w / 2,
                minY: y - h / 2, maxY: y + h / 2,
                minZ: z - d / 2, maxZ: z + d / 2,
            },
            isMoving: true, moveAxis, moveRange, moveSpeed,
            originX: x, originY: y, originZ: z,
            width: w, height: h, depth: d,
            velocityX: 0, velocityZ: 0,
        };

        this.platforms.push(platData);
        this.movingPlatforms.push(platData);
        return platData;
    }

    _addCheckpointMarker(x, y, z, w, d) {
        const ringGeo = new THREE.TorusGeometry(Math.max(w, d) * 0.4, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y + 0.5, z);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);

        const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.3 });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(x, y + 2, z);
        this.scene.add(beam);
    }

    _addGoalMarker(x, y, z) {
        const baseGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.4, 8);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(x, y + 0.3, z);
        this.scene.add(base);

        const cupGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.6, 8);
        const cupMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.set(x, y + 0.8, z);
        this.scene.add(cup);

        const starGeo = new THREE.OctahedronGeometry(0.3);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(x, y + 1.4, z);
        this.scene.add(star);
        this.goalStar = star;
    }

    // ===== NPC SYSTEM =====

    // Mob NPC (hostile, red eyes)
    _createMobNPC(npcKey, x, y, z, pattern, speed, range) {
        const data = NPC_ROSTER[npcKey];
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 0.45);
        const bodyMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.0;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        group.add(head);

        // Hair
        const hairGeo = new THREE.BoxGeometry(0.63, 0.18, 0.63);
        const hairMat = new THREE.MeshLambertMaterial({ color: data.hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.05;
        group.add(hair);

        // Angry eyes (red)
        const eyeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.13, 0.75, 0.31);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.13, 0.75, 0.31);
        group.add(rightEye);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.3);
        const armMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.46, 0.0, 0);
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.46, 0.0, 0);
        group.add(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 0.7, 0.4);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.18, -0.75, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.18, -0.75, 0);
        group.add(rightLeg);

        // Red name tag
        this._addNpcNameTag(group, data.name, 'rgba(200,0,0,0.7)', '#ffffff', 1.5);

        group.position.set(x, y, z);
        this.scene.add(group);

        const npc = {
            group,
            name: data.name,
            type: 'mob',
            pattern,
            speed: speed * 0.9, // 난이도 10% 감소
            range,
            originX: x, originY: y, originZ: z,
            leftArm, rightArm, leftLeg, rightLeg,
        };

        this.npcs.push(npc);
        return npc;
    }

    // Boss NPC (hostile, larger, crown)
    _createBossNPC(npcKey, x, y, z) {
        const data = NPC_ROSTER[npcKey];
        const group = new THREE.Group();
        const scale = 1.3;

        // Body (larger)
        const bodyGeo = new THREE.BoxGeometry(0.7 * scale, 0.8 * scale, 0.45 * scale);
        const bodyMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.0;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.6 * scale);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7 * scale;
        group.add(head);

        // Hair
        const hairGeo = new THREE.BoxGeometry(0.63 * scale, 0.18 * scale, 0.63 * scale);
        const hairMat = new THREE.MeshLambertMaterial({ color: data.hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.05 * scale;
        group.add(hair);

        // Crown (gold)
        const crownMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const crownBase = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.12, 0.5 * scale), crownMat);
        crownBase.position.y = 1.2 * scale;
        group.add(crownBase);
        // Crown spikes
        for (let i = -1; i <= 1; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), crownMat);
            spike.position.set(i * 0.15, 1.38 * scale, 0);
            group.add(spike);
        }

        // Angry eyes (bright red, larger)
        const eyeGeo = new THREE.BoxGeometry(0.15 * scale, 0.12 * scale, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.13 * scale, 0.75 * scale, 0.31 * scale);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.13 * scale, 0.75 * scale, 0.31 * scale);
        group.add(rightEye);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22 * scale, 0.7 * scale, 0.3 * scale);
        const armMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.46 * scale, 0.0, 0);
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.46 * scale, 0.0, 0);
        group.add(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3 * scale, 0.7 * scale, 0.4 * scale);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.18 * scale, -0.75 * scale, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.18 * scale, -0.75 * scale, 0);
        group.add(rightLeg);

        // BOSS name tag (red with "BOSS" prefix)
        this._addNpcNameTag(group, 'BOSS ' + data.name, 'rgba(180,0,0,0.9)', '#ffff00', 2.0 * scale);

        group.position.set(x, y, z);
        this.scene.add(group);

        const npc = {
            group,
            name: data.name,
            type: 'boss',
            pattern: 'boss',
            speed: 1.5,
            range: 5,
            originX: x, originY: y, originZ: z,
            leftArm, rightArm, leftLeg, rightLeg,
            scale,
        };

        this.npcs.push(npc);
        this.bossNpc = npc;
        return npc;
    }

    // Rescue NPC (friendly, green eyes, smaller)
    _createRescueNPC(npcKey, x, y, z) {
        const data = NPC_ROSTER[npcKey];
        const group = new THREE.Group();
        const scale = 0.8;

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.7 * scale, 0.8 * scale, 0.45 * scale);
        const bodyMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.0;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.6 * scale);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7 * scale;
        group.add(head);

        // Hair
        const hairGeo = new THREE.BoxGeometry(0.63 * scale, 0.18 * scale, 0.63 * scale);
        const hairMat = new THREE.MeshLambertMaterial({ color: data.hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.05 * scale;
        group.add(hair);

        // Happy eyes (green)
        const eyeGeo = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.13 * scale, 0.75 * scale, 0.31 * scale);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.13 * scale, 0.75 * scale, 0.31 * scale);
        group.add(rightEye);

        // Smile
        const smileGeo = new THREE.BoxGeometry(0.2 * scale, 0.04, 0.05);
        const smileMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.position.set(0, 0.62 * scale, 0.31 * scale);
        group.add(smile);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22 * scale, 0.7 * scale, 0.3 * scale);
        const armMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.46 * scale, 0.0, 0);
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.46 * scale, 0.0, 0);
        group.add(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3 * scale, 0.7 * scale, 0.4 * scale);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.18 * scale, -0.75 * scale, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.18 * scale, -0.75 * scale, 0);
        group.add(rightLeg);

        // "Help!" effect (bouncing exclamation above head)
        const helpCanvas = document.createElement('canvas');
        helpCanvas.width = 128;
        helpCanvas.height = 64;
        const hCtx = helpCanvas.getContext('2d');
        hCtx.font = 'bold 40px sans-serif';
        hCtx.textAlign = 'center';
        hCtx.fillStyle = '#ff6b6b';
        hCtx.fillText('도와줘!', 64, 44);
        const helpTex = new THREE.CanvasTexture(helpCanvas);
        const helpMat = new THREE.SpriteMaterial({ map: helpTex, transparent: true });
        const helpSprite = new THREE.Sprite(helpMat);
        helpSprite.scale.set(1.2, 0.6, 1);
        helpSprite.position.y = 1.8 * scale;
        group.add(helpSprite);

        // Green name tag
        this._addNpcNameTag(group, data.name, 'rgba(0,150,0,0.7)', '#ffffff', 1.3 * scale);

        group.position.set(x, y, z);
        this.scene.add(group);

        const npc = {
            group,
            name: data.name,
            type: 'rescue',
            rescued: false,
            originX: x, originY: y, originZ: z,
            leftArm, rightArm, leftLeg, rightLeg,
            scale,
        };

        this.rescueNpcs.push(npc);
        return npc;
    }

    _addNpcNameTag(group, text, bgColor, textColor, yPos) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 8, 256, 48, 12);
        } else {
            ctx.rect(0, 8, 256, 48);
        }
        ctx.fill();
        ctx.font = 'bold 28px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.fillText(text, 128, 44);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const nameSprite = new THREE.Sprite(spriteMat);
        nameSprite.scale.set(1.5, 0.4, 1);
        nameSprite.position.y = yPos;
        group.add(nameSprite);
    }

    // ===== MAP BUILDING =====
    _buildMap() {
        const md = this.mapData;
        this.scene.background = new THREE.Color(md.skyColor);
        this.scene.fog = new THREE.Fog(md.fogColor, 50, 150);

        if (this.mapId === 'samsung') this._buildSamsung();
        else if (this.mapId === 'yeoksam') this._buildYeoksam();
        else if (this.mapId === 'daechi') this._buildDaechi();

        this._addGround();
    }

    // ========== 삼성동 (도시, 보통 난이도) ==========
    // Boss: 큰이모, Mobs: 하하+명태, Rescue: 이안+이서
    _buildSamsung() {
        // Section 1: 시작
        this._addPlatform(0, 0, 0, 6.6, 1, 6.6, 0x95a5a6);     // ×1.1
        this._addPlatform(0, 0, -7, 4.4, 1, 4.4, 0x3498db);
        this._addPlatform(0, 0.5, -13, 4.4, 1, 4.4, 0x3498db);
        this._addPlatform(0, 1, -19, 3.3, 1, 3.3, 0x2980b9);
        this._addPlatform(3, 1.5, -24, 3.3, 1, 3.3, 0x2980b9);
        this._addPlatform(0, 2, -29, 3.3, 1, 3.3, 0x7f8c8d);

        // Mob 1: 하하 (빠른 좌우)
        this._createMobNPC('haha', 0, 3.2, -16, 'horizontal', 3.0, 3.5);

        this._addPlatform(0, 2.5, -35, 5.5, 1, 5.5, 0x4ecdc4, true); // CP1

        // Section 2: 빌딩 사이
        this._addPlatform(-4, 3, -41, 3.3, 1, 3.3, 0x7f8c8d);
        this._addPlatform(0, 3.5, -47, 2.75, 1, 2.75, 0x95a5a6);
        this._addPlatform(4, 4, -52, 2.75, 1, 2.75, 0xbdc3c7);
        this._addPlatform(0, 4.5, -58, 2.75, 1, 2.75, 0x95a5a6);

        // Mob 2: 명태 (좌우)
        this._createMobNPC('myeongtae', 0, 5.7, -55, 'horizontal', 1.8, 3);

        this._addPlatform(-3, 5, -63, 2.2, 1, 2.2, 0x3498db);
        this._addPlatform(0, 5.5, -68, 3.3, 1, 3.3, 0x3498db);
        this._addPlatform(3, 6, -72, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(3, 7, -75, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(3, 8, -78, 2.2, 1, 2.2, 0x2c3e50);

        this._addPlatform(0, 8.5, -83, 5.5, 1, 5.5, 0x4ecdc4, true); // CP2

        // Section 3: 움직이는 플랫폼
        this._addMovingPlatform(0, 9, -90, 3.45, 0.5, 3.45, 0x3498db, 'x', 4, 1.3);
        this._addPlatform(0, 9.5, -97, 2.75, 1, 2.75, 0x7f8c8d);

        this._addMovingPlatform(0, 10, -104, 3.45, 0.5, 3.45, 0x3498db, 'x', 5, 1.7);
        this._addPlatform(3, 10.5, -110, 2.75, 1, 2.75, 0x95a5a6);
        this._addMovingPlatform(0, 11, -116, 3.45, 0.5, 3.45, 0xbdc3c7, 'y', 3, 1.0);

        this._addPlatform(0, 13, -122, 5.5, 1, 5.5, 0x4ecdc4, true); // CP3

        // Section 4: 좁은 길
        this._addPlatform(0, 13.5, -127, 1.65, 1, 1.65, 0x2c3e50);
        this._addPlatform(2, 14, -131, 1.65, 1, 1.65, 0x2c3e50);
        this._addPlatform(-1, 14.5, -135, 1.65, 1, 1.65, 0x34495e);
        this._addPlatform(1, 15.5, -139, 1.65, 1, 1.65, 0x34495e);
        this._addPlatform(-2, 16.5, -143, 1.65, 1, 1.65, 0x7f8c8d);
        this._addPlatform(0, 13, -148, 2.2, 1, 2.2, 0x95a5a6);
        this._addPlatform(0, 15, -153, 2.2, 1, 2.2, 0x95a5a6);
        this._addPlatform(3, 17, -157, 2.2, 1, 2.2, 0xbdc3c7);

        this._addPlatform(0, 17.5, -163, 5.5, 1, 5.5, 0x4ecdc4, true); // CP4

        // Section 5: 보스 구간
        this._addMovingPlatform(0, 18, -170, 2.3, 0.5, 2.3, 0x3498db, 'x', 3, 1.5);
        this._addPlatform(0, 18.5, -176, 2.2, 1, 2.2, 0xbdc3c7);

        // BOSS: 큰이모
        this._createBossNPC('keunimo', 0, 19.7, -182);

        this._addMovingPlatform(3, 19, -182, 2.3, 0.5, 2.3, 0x3498db, 'z', 3, 1.3);
        this._addPlatform(0, 19.5, -188, 2.2, 1, 2.2, 0xbdc3c7);
        this._addPlatform(3, 20, -192, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(-3, 21, -196, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(3, 22, -200, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(-3, 23, -204, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(0, 24, -208, 2.2, 1, 2.2, 0x2c3e50);
        this._addPlatform(0, 25, -214, 2.2, 1, 2.2, 0x95a5a6);
        this._addPlatform(0, 25.5, -220, 6.6, 1, 6.6, 0xffd700, false, true); // GOAL

        // Rescue targets on goal platform
        this._createRescueNPC('ian', -1.5, 27.2, -220);
        this._createRescueNPC('iseo', 1.5, 27.2, -220);

        this._addCityDecorations();
    }

    // ========== 역삼동 (공원, 쉬운 난이도) ==========
    // Boss: 명태이모, Mobs: 큰이모+하하, Rescue: 김재우
    _buildYeoksam() {
        // Section 1: 공원 입구
        this._addPlatform(0, 0, 0, 6.6, 1, 6.6, 0x27ae60);
        this._addPlatform(0, 0, -7, 4.4, 1, 4.4, 0x2ecc71);
        this._addPlatform(3, 0.5, -13, 4.4, 1, 4.4, 0x2ecc71);
        this._addPlatform(0, 1, -19, 4.4, 1, 4.4, 0x1abc9c);
        this._addPlatform(-3, 1.5, -25, 3.3, 1, 3.3, 0x1abc9c);
        this._addPlatform(0, 2, -30, 3.3, 1, 3.3, 0x16a085);

        // Mob 1: 큰이모 (전후)
        this._createMobNPC('keunimo', 0, 3.2, -22, 'vertical', 1.35, 3);

        this._addPlatform(0, 2.5, -36, 5.5, 1, 5.5, 0x4ecdc4, true); // CP1

        // Section 2: 산책로
        this._addPlatform(4, 3, -42, 3.3, 1, 3.3, 0x8b4513);
        this._addPlatform(0, 3, -48, 3.3, 1, 3.3, 0x8b4513);
        this._addPlatform(-4, 3.5, -54, 3.3, 1, 3.3, 0xa0522d);
        this._addPlatform(0, 4, -60, 3.3, 1, 3.3, 0xa0522d);
        this._addPlatform(3, 4.5, -65, 3.3, 1, 3.3, 0x27ae60);

        // Mob 2: 하하 (빠른 좌우)
        this._createMobNPC('haha', 0, 5.2, -60, 'horizontal', 2.7, 3.5);

        this._addPlatform(0, 5, -70, 3.3, 1, 3.3, 0x27ae60);
        this._addPlatform(-2, 5.5, -75, 2.75, 1, 2.75, 0x2ecc71);
        this._addPlatform(2, 6, -80, 2.75, 1, 2.75, 0x2ecc71);

        this._addPlatform(0, 6.5, -86, 5.5, 1, 5.5, 0x4ecdc4, true); // CP2

        // Section 3: 연못 위
        this._addMovingPlatform(0, 7, -93, 4.0, 0.5, 4.0, 0x1abc9c, 'x', 3, 1.0);
        this._addPlatform(0, 7.5, -100, 3.3, 1, 3.3, 0x228b22);

        this._addMovingPlatform(0, 8, -107, 4.0, 0.5, 4.0, 0x1abc9c, 'z', 3, 0.85);
        this._addPlatform(0, 8.5, -114, 3.3, 1, 3.3, 0x228b22);
        this._addMovingPlatform(0, 9, -120, 4.0, 0.5, 4.0, 0x27ae60, 'y', 2, 0.85);

        this._addPlatform(0, 11, -126, 5.5, 1, 5.5, 0x4ecdc4, true); // CP3

        // Section 4: 언덕
        this._addPlatform(0, 11.5, -131, 2.75, 1, 2.75, 0x8b4513);
        this._addPlatform(3, 12, -136, 2.75, 1, 2.75, 0x8b4513);
        this._addPlatform(-2, 12.5, -141, 2.75, 1, 2.75, 0xa0522d);
        this._addPlatform(1, 13, -146, 2.75, 1, 2.75, 0xa0522d);

        this._addPlatform(0, 13.5, -152, 2.75, 1, 2.75, 0x228b22);
        this._addPlatform(0, 14, -158, 3.3, 1, 3.3, 0x228b22);

        this._addPlatform(0, 14.5, -164, 5.5, 1, 5.5, 0x4ecdc4, true); // CP4

        // Section 5: 보스 구간
        this._addMovingPlatform(0, 15, -171, 2.9, 0.5, 2.9, 0x1abc9c, 'x', 3, 1.3);
        this._addPlatform(0, 15.5, -177, 2.2, 1, 2.2, 0x27ae60);

        // BOSS: 명태이모
        this._createBossNPC('myeongtae', 0, 16.7, -183);

        this._addPlatform(3, 16, -182, 2.2, 1, 2.2, 0x2ecc71);
        this._addPlatform(-3, 17, -187, 2.2, 1, 2.2, 0x2ecc71);
        this._addPlatform(0, 18, -192, 2.2, 1, 2.2, 0x1abc9c);
        this._addPlatform(0, 19, -198, 2.75, 1, 2.75, 0x27ae60);
        this._addPlatform(0, 19.5, -204, 6.6, 1, 6.6, 0xffd700, false, true); // GOAL

        // Rescue target on goal platform
        this._createRescueNPC('jaewoo', 0, 21.2, -204);

        this._addParkDecorations();
    }

    // ========== 대치동 (학원가, 어려운 난이도) ==========
    // Boss: 하하, Mobs: 큰이모+명태, Rescue: 이안+이서
    _buildDaechi() {
        // Section 1
        this._addPlatform(0, 0, 0, 5.5, 1, 5.5, 0x9b59b6);
        this._addPlatform(0, 0.5, -7, 2.75, 1, 2.75, 0x8e44ad);
        this._addPlatform(3, 1, -13, 2.2, 1, 2.2, 0x8e44ad);
        this._addPlatform(-2, 2, -18, 2.2, 1, 2.2, 0x6c3483);
        this._addPlatform(2, 3, -23, 1.65, 1, 1.65, 0x6c3483);

        // Mob 1: 큰이모 (전후)
        this._createMobNPC('keunimo', 0, 4.2, -13, 'vertical', 1.35, 3);

        this._addPlatform(0, 3.5, -28, 2.2, 1, 2.2, 0x9b59b6);
        this._addPlatform(0, 4, -34, 5.5, 1, 5.5, 0x4ecdc4, true); // CP1

        // Section 2: 좁은 점프
        this._addPlatform(3, 4.5, -40, 1.65, 1, 1.65, 0xf1c40f);
        this._addPlatform(-3, 5.5, -45, 1.65, 1, 1.65, 0xf1c40f);
        this._addPlatform(2, 6.5, -50, 1.65, 1, 1.65, 0xf39c12);
        this._addPlatform(-2, 7.5, -55, 1.65, 1, 1.65, 0xf39c12);

        // Mob 2: 명태 (좌우)
        this._createMobNPC('myeongtae', 0, 8.7, -52, 'horizontal', 1.8, 3);

        this._addPlatform(0, 8, -60, 1.65, 1, 1.65, 0xe67e22);
        this._addPlatform(3, 9, -64, 1.65, 1, 1.65, 0xe67e22);
        this._addPlatform(0, 10, -68, 2.2, 1, 2.2, 0x9b59b6);

        this._addPlatform(0, 10.5, -74, 5.5, 1, 5.5, 0x4ecdc4, true); // CP2

        // Section 3: 빠른 움직이는 발판
        this._addMovingPlatform(0, 11, -81, 2.3, 0.5, 2.3, 0xf1c40f, 'x', 5, 2.1);
        this._addPlatform(0, 11.5, -88, 1.65, 1, 1.65, 0x9b59b6);
        this._addMovingPlatform(0, 12, -94, 2.3, 0.5, 2.3, 0xf1c40f, 'z', 4, 1.7);

        this._addPlatform(3, 12.5, -100, 1.65, 1, 1.65, 0x8e44ad);
        this._addMovingPlatform(-2, 13, -106, 2.3, 0.5, 2.3, 0xe67e22, 'y', 4, 1.3);
        this._addMovingPlatform(2, 14, -112, 2.3, 0.5, 2.3, 0xe67e22, 'x', 4, 1.9);

        this._addPlatform(0, 15, -118, 5.5, 1, 5.5, 0x4ecdc4, true); // CP3

        // Section 4: 극한 점프
        this._addPlatform(0, 15.5, -123, 1.45, 1, 1.45, 0x6c3483);   // was 1.2→1.45
        this._addPlatform(3, 16.5, -127, 1.45, 1, 1.45, 0x6c3483);
        this._addPlatform(-3, 17.5, -131, 1.45, 1, 1.45, 0x9b59b6);

        this._addPlatform(0, 18, -135, 1.45, 1, 1.45, 0x9b59b6);
        this._addPlatform(2, 19, -139, 1.45, 1, 1.45, 0x8e44ad);
        this._addPlatform(-2, 20, -143, 1.45, 1, 1.45, 0x8e44ad);
        this._addPlatform(0, 14, -148, 2.2, 1, 2.2, 0xf1c40f);
        this._addPlatform(0, 17, -153, 2.2, 1, 2.2, 0xf1c40f);
        this._addPlatform(3, 20, -157, 1.65, 1, 1.65, 0xf39c12);

        this._addPlatform(0, 20.5, -163, 5.5, 1, 5.5, 0x4ecdc4, true); // CP4

        // Section 5: 보스 구간
        this._addMovingPlatform(0, 21, -170, 1.75, 0.5, 1.75, 0xe67e22, 'x', 4, 2.1);
        this._addPlatform(0, 21.5, -176, 1.45, 1, 1.45, 0x6c3483);

        // BOSS: 하하
        this._createBossNPC('haha', 0, 22.7, -182);

        this._addMovingPlatform(3, 22, -182, 1.75, 0.5, 1.75, 0xe67e22, 'z', 4, 1.7);
        this._addPlatform(0, 22.5, -188, 1.45, 1, 1.45, 0x6c3483);
        this._addPlatform(3, 23.5, -192, 1.65, 1, 1.65, 0x9b59b6);
        this._addPlatform(-3, 24.5, -196, 1.65, 1, 1.65, 0x9b59b6);
        this._addPlatform(3, 25.5, -200, 1.65, 1, 1.65, 0x8e44ad);
        this._addPlatform(-3, 26.5, -204, 1.65, 1, 1.65, 0x8e44ad);
        this._addPlatform(0, 27.5, -208, 1.65, 1, 1.65, 0x6c3483);
        this._addPlatform(0, 28, -214, 2.2, 1, 2.2, 0xf1c40f);
        this._addPlatform(0, 28.5, -220, 6.6, 1, 6.6, 0xffd700, false, true); // GOAL

        // Rescue targets on goal platform
        this._createRescueNPC('ian', -1.5, 30.2, -220);
        this._createRescueNPC('iseo', 1.5, 30.2, -220);

        this._addAcademyDecorations();
    }

    // ===== DECORATIONS =====
    _addGround() {
        const groundGeo = new THREE.PlaneGeometry(300, 500);
        const groundMat = new THREE.MeshLambertMaterial({ color: this.mapData.groundColor });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -15, -100);
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    _addCityDecorations() {
        const buildingColors = [0x455a64, 0x607d8b, 0x78909c, 0x546e7a];
        const buildingPositions = [
            [-15, -15, -20, 5, 20], [20, -15, -50, 4, 25], [-25, -15, -80, 6, 18],
            [18, -15, -120, 4, 22], [-20, -15, -160, 5, 30], [25, -15, -200, 4, 15],
        ];
        for (const [bx, by, bz, bw, bh] of buildingPositions) {
            const geo = new THREE.BoxGeometry(bw, bh, bw);
            const mat = new THREE.MeshLambertMaterial({ color: buildingColors[Math.floor(Math.random() * buildingColors.length)] });
            const building = new THREE.Mesh(geo, mat);
            building.position.set(bx, by + bh / 2, bz);
            building.castShadow = true;
            this.scene.add(building);
        }
        this._addClouds();
    }

    _addParkDecorations() {
        const treePositions = [
            [-12, -15, -20], [15, -15, -50], [-20, -15, -80],
            [18, -15, -120], [-15, -15, -160], [20, -15, -190],
            [-8, -15, -40], [10, -15, -100], [-18, -15, -140],
            [12, -15, -70], [-10, -15, -110],
        ];
        for (const [tx, ty, tz] of treePositions) {
            const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(tx, ty + 1.5, tz);
            this.scene.add(trunk);

            const leavesGeo = new THREE.ConeGeometry(2, 4, 6);
            const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.set(tx, ty + 5, tz);
            this.scene.add(leaves);
        }
        this._addClouds();
    }

    _addAcademyDecorations() {
        const bookColors = [0x9b59b6, 0xf1c40f, 0xe74c3c, 0x3498db];
        const bookPositions = [
            [-15, -15, -30], [20, -15, -70], [-22, -15, -110],
            [15, -15, -150], [-18, -15, -190], [22, -15, -210],
        ];
        for (const [bx, by, bz] of bookPositions) {
            const group = new THREE.Group();
            for (let i = 0; i < 4; i++) {
                const bookGeo = new THREE.BoxGeometry(3, 0.5, 2);
                const bookMat = new THREE.MeshLambertMaterial({ color: bookColors[i] });
                const book = new THREE.Mesh(bookGeo, bookMat);
                book.position.y = i * 0.6;
                book.rotation.y = (Math.random() - 0.5) * 0.3;
                group.add(book);
            }
            group.position.set(bx, by + 1, bz);
            this.scene.add(group);
        }

        const pencilPositions = [
            [-10, -15, -50], [12, -15, -90], [-16, -15, -130], [14, -15, -170],
        ];
        for (const [px, py, pz] of pencilPositions) {
            const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 6);
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
            const pencilBody = new THREE.Mesh(bodyGeo, bodyMat);
            pencilBody.position.set(px, py + 4, pz);
            this.scene.add(pencilBody);

            const tipGeo = new THREE.ConeGeometry(0.3, 1, 6);
            const tipMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.position.set(px, py + 8.5, pz);
            this.scene.add(tip);
        }
        this._addClouds();
    }

    _addClouds() {
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
        const cloudPositions = [
            [-10, 35, -30], [15, 30, -70], [-20, 40, -130],
            [10, 35, -180], [-5, 38, -220],
        ];
        for (const [cx, cy, cz] of cloudPositions) {
            const cloudGroup = new THREE.Group();
            for (let i = 0; i < 5; i++) {
                const size = 1.5 + Math.random() * 2;
                const cloudPart = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), cloudMat);
                cloudPart.position.set(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 2
                );
                cloudGroup.add(cloudPart);
            }
            cloudGroup.position.set(cx, cy, cz);
            this.scene.add(cloudGroup);
        }
    }

    // ===== UPDATE =====
    update(time) {
        // Moving platforms
        for (const plat of this.movingPlatforms) {
            const prevX = plat.mesh.position.x;
            const prevZ = plat.mesh.position.z;

            if (plat.moveAxis === 'x') {
                plat.mesh.position.x = plat.originX + Math.sin(time * plat.moveSpeed) * plat.moveRange;
            } else if (plat.moveAxis === 'y') {
                plat.mesh.position.y = plat.originY + Math.sin(time * plat.moveSpeed) * plat.moveRange;
            } else if (plat.moveAxis === 'z') {
                plat.mesh.position.z = plat.originZ + Math.sin(time * plat.moveSpeed) * plat.moveRange;
            }

            const p = plat.mesh.position;
            plat.box.minX = p.x - plat.width / 2;
            plat.box.maxX = p.x + plat.width / 2;
            plat.box.minY = p.y - plat.height / 2;
            plat.box.maxY = p.y + plat.height / 2;
            plat.box.minZ = p.z - plat.depth / 2;
            plat.box.maxZ = p.z + plat.depth / 2;

            plat.velocityX = plat.mesh.position.x - prevX;
            plat.velocityZ = plat.mesh.position.z - prevZ;
        }

        // Hostile NPCs (mobs + boss)
        for (const npc of this.npcs) {
            const t = time;
            if (npc.pattern === 'horizontal') {
                npc.group.position.x = npc.originX + Math.sin(t * npc.speed) * npc.range;
                npc.group.rotation.y = Math.cos(t * npc.speed) > 0 ? 0 : Math.PI;
            } else if (npc.pattern === 'vertical') {
                npc.group.position.z = npc.originZ + Math.sin(t * npc.speed) * npc.range;
                npc.group.rotation.y = Math.cos(t * npc.speed) > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else if (npc.pattern === 'circular') {
                npc.group.position.x = npc.originX + Math.cos(t * npc.speed) * npc.range;
                npc.group.position.z = npc.originZ + Math.sin(t * npc.speed) * npc.range;
                npc.group.rotation.y = -t * npc.speed;
            } else if (npc.pattern === 'bounce') {
                npc.group.position.y = npc.originY + Math.abs(Math.sin(t * npc.speed)) * npc.range;
            } else if (npc.pattern === 'boss') {
                // Boss: complex pattern (circular + vertical bounce)
                npc.group.position.x = npc.originX + Math.cos(t * npc.speed * 0.7) * npc.range;
                npc.group.position.z = npc.originZ + Math.sin(t * npc.speed * 0.7) * (npc.range * 0.6);
                npc.group.position.y = npc.originY + Math.abs(Math.sin(t * npc.speed * 1.5)) * 1.5;
                npc.group.rotation.y = -t * npc.speed * 0.7;
            }

            // Animate NPC limbs
            const walkT = t * (npc.speed || 1.5) * 3;
            const swing = Math.sin(walkT) * 0.5;
            npc.leftArm.rotation.x = swing;
            npc.rightArm.rotation.x = -swing;
            npc.leftLeg.rotation.x = -swing;
            npc.rightLeg.rotation.x = swing;
        }

        // Rescue NPCs (idle animation)
        for (const npc of this.rescueNpcs) {
            if (npc.rescued) continue;
            // Small idle bounce
            npc.group.position.y = npc.originY + Math.sin(time * 2) * 0.15;
            // Wave arms
            const wave = Math.sin(time * 4) * 0.4;
            npc.leftArm.rotation.x = wave;
            npc.rightArm.rotation.x = -wave;
        }

        // Goal star
        if (this.goalStar) {
            this.goalStar.rotation.y += 0.02;
            this.goalStar.rotation.x += 0.01;
        }
    }

    // ===== COLLISION CHECKS =====
    checkNPCCollision(playerPosition) {
        const playerRadius = 0.6;
        for (const npc of this.npcs) {
            const dx = playerPosition.x - npc.group.position.x;
            const dy = playerPosition.y - npc.group.position.y;
            const dz = playerPosition.z - npc.group.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const npcRadius = npc.type === 'boss' ? 0.8 : 0.6;
            if (dist < playerRadius + npcRadius) {
                return npc.name + (npc.type === 'boss' ? ' (BOSS)' : '');
            }
        }
        return null;
    }

    checkRescueCollision(playerPosition) {
        const playerRadius = 0.6;
        for (const npc of this.rescueNpcs) {
            if (npc.rescued) continue;
            const dx = playerPosition.x - npc.group.position.x;
            const dy = playerPosition.y - npc.group.position.y;
            const dz = playerPosition.z - npc.group.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < playerRadius + 0.5) {
                npc.rescued = true;
                npc.group.visible = false;
                this.rescuedCount++;
                return npc.name;
            }
        }
        return null;
    }

    getBossPosition() {
        if (this.bossNpc) {
            return this.bossNpc.group.position;
        }
        return null;
    }

    checkCheckpoints(playerPosition) {
        for (const cp of this.checkpoints) {
            const dist = playerPosition.distanceTo(cp.position);
            if (dist < 3) {
                return cp;
            }
        }
        return null;
    }

    checkGoal(playerPosition) {
        if (!this.goalPlatform) return false;
        const gp = this.goalPlatform.mesh.position;
        const dist = new THREE.Vector2(
            playerPosition.x - gp.x,
            playerPosition.z - gp.z
        ).length();
        return dist < 3 && Math.abs(playerPosition.y - gp.y) < 3;
    }

    reset() {}
}
