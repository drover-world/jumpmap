const CHARACTER_DATA = {
    woozu: {
        name: '우주',
        theme: 'math',
        bodyColor: 0xf0f0f0,      // 흰색 가운
        hairColor: 0x1a1a1a,       // 짧은 검정 머리
        skinColor: 0xf5cba7,
        legColor: 0x2c3e50,        // 어두운 바지
        hairStyle: 'short',
        faceTexture: 'img/woozu.jpg',
        desc: '천재 수학자',
    },
    taeju: {
        name: '태주',
        theme: 'science',
        bodyColor: 0xe8e8e8,       // 하얀 실험복
        hairColor: 0x1a1a1a,       // 긴 검정 머리
        skinColor: 0xf5cba7,
        legColor: 0x34495e,        // 어두운 바지
        hairStyle: 'long',
        faceTexture: 'img/taeju.jpg',
        desc: '천재 과학자',
    },
    seohyun: {
        name: '서현',
        theme: 'swim',
        bodyColor: 0xff69b4,       // 분홍 수영복
        hairColor: 0xf1c40f,       // 노랑 머리
        skinColor: 0xf5cba7,
        legColor: 0xf5cba7,        // 맨다리(피부색)
        hairStyle: 'short',
        faceTexture: null,
        desc: '수영 챔피언',
    },
    seojun: {
        name: '서준',
        theme: 'hockey',
        bodyColor: 0x1e88e5,       // 파랑 유니폼
        hairColor: 0x8b4513,       // 갈색 머리
        skinColor: 0xf5cba7,
        legColor: 0x1565c0,        // 파란 바지
        hairStyle: 'short',
        faceTexture: null,
        desc: '아이스하키 선수',
    },
};

class Player {
    constructor(scene, characterId) {
        this.scene = scene;
        this.characterId = characterId || 'woozu';
        this.charData = CHARACTER_DATA[this.characterId];
        this.group = new THREE.Group();

        // Physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -25;
        this.jumpForce = 10.5;
        this.moveSpeed = 7;
        this.isGrounded = false;
        this.canJump = true;

        // State
        this.isDead = false;
        this.checkpoint = new THREE.Vector3(0, 2, 0);
        this.deathCount = 0;
        this.currentCheckpointIndex = 0;

        // Size for collision
        this.width = 0.8;
        this.height = 1.8;
        this.depth = 0.8;

        // Input
        this.keys = {};

        // Touch input
        this.touchMoveX = 0;
        this.touchMoveZ = 0;
        this.touchJump = false;

        this._buildCharacter();
        this._addNameTag();
        this.group.position.set(0, 2, 0);
        scene.add(this.group);

        this._setupInput();
    }

    _buildCharacter() {
        const cd = this.charData;

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.9, 0.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: cd.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.05;
        body.castShadow = true;
        this.group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);

        if (cd.faceTexture) {
            const loader = new THREE.TextureLoader();
            const faceTex = loader.load(cd.faceTexture);
            const headMats = [
                new THREE.MeshLambertMaterial({ color: cd.skinColor }),
                new THREE.MeshLambertMaterial({ color: cd.skinColor }),
                new THREE.MeshLambertMaterial({ color: cd.skinColor }),
                new THREE.MeshLambertMaterial({ color: cd.skinColor }),
                new THREE.MeshLambertMaterial({ map: faceTex }),
                new THREE.MeshLambertMaterial({ color: cd.hairColor }),
            ];
            const head = new THREE.Mesh(headGeo, headMats);
            head.position.y = 0.825;
            head.castShadow = true;
            this.group.add(head);
        } else {
            const headMat = new THREE.MeshLambertMaterial({ color: cd.skinColor });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.825;
            head.castShadow = true;
            this.group.add(head);

            const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
            const eyeMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-0.15, 0.87, 0.33);
            this.group.add(leftEye);
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(0.15, 0.87, 0.33);
            this.group.add(rightEye);

            const smileGeo = new THREE.BoxGeometry(0.25, 0.05, 0.05);
            const smileMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
            const smile = new THREE.Mesh(smileGeo, smileMat);
            smile.position.set(0, 0.72, 0.33);
            this.group.add(smile);
        }

        // Hair
        if (cd.hairStyle === 'long') {
            const hairMat = new THREE.MeshLambertMaterial({ color: cd.hairColor });
            const hairTopGeo = new THREE.BoxGeometry(0.68, 0.2, 0.68);
            const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
            hairTop.position.y = 1.2;
            this.group.add(hairTop);

            const sideHairGeo = new THREE.BoxGeometry(0.12, 0.7, 0.5);
            const sideHairL = new THREE.Mesh(sideHairGeo, hairMat);
            sideHairL.position.set(-0.38, 0.7, 0);
            this.group.add(sideHairL);
            const sideHairR = new THREE.Mesh(sideHairGeo, hairMat);
            sideHairR.position.set(0.38, 0.7, 0);
            this.group.add(sideHairR);

            const backHairGeo = new THREE.BoxGeometry(0.55, 0.9, 0.15);
            const backHair = new THREE.Mesh(backHairGeo, hairMat);
            backHair.position.set(0, 0.55, -0.35);
            this.group.add(backHair);
        } else {
            const hairGeo = new THREE.BoxGeometry(0.68, 0.2, 0.68);
            const hairMat = new THREE.MeshLambertMaterial({ color: cd.hairColor });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = 1.2;
            this.group.add(hair);
        }

        // Left arm
        const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.35);
        const armMat = new THREE.MeshLambertMaterial({ color: cd.skinColor });
        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.525, 0.05, 0);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(0.525, 0.05, 0);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.45);
        const legMat = new THREE.MeshLambertMaterial({ color: cd.legColor });
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.2, -0.8, 0);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.2, -0.8, 0);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);

        // Theme-specific accessories
        this._buildAccessories();
    }

    _buildAccessories() {
        const theme = this.charData.theme;

        if (theme === 'math') {
            // Glasses (wire frame on face)
            const glassMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            // Left lens frame
            const lensGeo = new THREE.TorusGeometry(0.09, 0.015, 6, 12);
            const leftLens = new THREE.Mesh(lensGeo, glassMat);
            leftLens.position.set(-0.13, 0.87, 0.34);
            this.group.add(leftLens);
            const rightLens = new THREE.Mesh(lensGeo, glassMat);
            rightLens.position.set(0.13, 0.87, 0.34);
            this.group.add(rightLens);
            // Bridge
            const bridgeGeo = new THREE.BoxGeometry(0.08, 0.02, 0.02);
            const bridge = new THREE.Mesh(bridgeGeo, glassMat);
            bridge.position.set(0, 0.87, 0.35);
            this.group.add(bridge);

            // Pi symbol on body (small white plate with symbol)
            const piCanvas = document.createElement('canvas');
            piCanvas.width = 64;
            piCanvas.height = 64;
            const piCtx = piCanvas.getContext('2d');
            piCtx.fillStyle = '#f0f0f0';
            piCtx.fillRect(0, 0, 64, 64);
            piCtx.font = 'bold 48px serif';
            piCtx.textAlign = 'center';
            piCtx.fillStyle = '#2c3e50';
            piCtx.fillText('\u03C0', 32, 48);
            const piTex = new THREE.CanvasTexture(piCanvas);
            const piMat = new THREE.SpriteMaterial({ map: piTex, transparent: true });
            const piSprite = new THREE.Sprite(piMat);
            piSprite.scale.set(0.3, 0.3, 1);
            piSprite.position.set(0, 0.15, 0.26);
            this.group.add(piSprite);
        }

        if (theme === 'science') {
            // Safety goggles on forehead
            const goggleMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.6 });
            const goggleGeo = new THREE.BoxGeometry(0.55, 0.15, 0.1);
            const goggles = new THREE.Mesh(goggleGeo, goggleMat);
            goggles.position.set(0, 1.05, 0.3);
            this.group.add(goggles);
            // Goggle frame
            const frameMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const frameGeo = new THREE.BoxGeometry(0.58, 0.03, 0.12);
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.set(0, 1.13, 0.3);
            this.group.add(frame);

            // Test tube in right hand (green liquid)
            const tubeMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
            const tubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
            const tube = new THREE.Mesh(tubeGeo, tubeMat);
            tube.position.set(0.6, 0.15, 0.15);
            tube.rotation.z = -0.3;
            this.group.add(tube);
            // Green liquid inside
            const liquidMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
            const liquidGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6);
            const liquid = new THREE.Mesh(liquidGeo, liquidMat);
            liquid.position.set(0.6, 0.05, 0.15);
            liquid.rotation.z = -0.3;
            this.group.add(liquid);
        }

        if (theme === 'swim') {
            // Swim goggles on forehead
            const goggleMat = new THREE.MeshBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.7 });
            const lGeo = new THREE.TorusGeometry(0.1, 0.02, 6, 12);
            const lGoggle = new THREE.Mesh(lGeo, goggleMat);
            lGoggle.position.set(-0.13, 1.05, 0.28);
            this.group.add(lGoggle);
            const rGoggle = new THREE.Mesh(lGeo, goggleMat);
            rGoggle.position.set(0.13, 1.05, 0.28);
            this.group.add(rGoggle);
            // Strap
            const strapMat = new THREE.MeshBasicMaterial({ color: 0x00838f });
            const strapGeo = new THREE.BoxGeometry(0.5, 0.04, 0.02);
            const strap = new THREE.Mesh(strapGeo, strapMat);
            strap.position.set(0, 1.05, 0.2);
            this.group.add(strap);

            // Swim tube (torus around waist)
            const tubeMat = new THREE.MeshLambertMaterial({ color: 0xff9800 });
            const tubeGeo = new THREE.TorusGeometry(0.5, 0.12, 8, 16);
            const swimTube = new THREE.Mesh(tubeGeo, tubeMat);
            swimTube.position.y = -0.2;
            swimTube.rotation.x = Math.PI / 2;
            this.group.add(swimTube);
        }

        if (theme === 'hockey') {
            // Helmet (half sphere on head)
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
            const helmetGeo = new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.y = 1.15;
            this.group.add(helmet);
            // Visor
            const visorMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 });
            const visorGeo = new THREE.BoxGeometry(0.5, 0.15, 0.05);
            const visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 0.92, 0.35);
            this.group.add(visor);

            // Hockey stick (held in hand)
            const stickMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const stickGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
            const stick = new THREE.Mesh(stickGeo, stickMat);
            stick.position.set(0.65, -0.2, 0);
            stick.rotation.z = -0.2;
            this.group.add(stick);
            // Blade
            const bladeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const bladeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.3);
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.set(0.72, -0.78, 0.1);
            this.group.add(blade);
        }
    }

    _addNameTag() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 8, 256, 48, 12);
        } else {
            ctx.rect(0, 8, 256, 48);
        }
        ctx.fill();
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.charData.name, 128, 44);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.nameSprite = new THREE.Sprite(spriteMat);
        this.nameSprite.scale.set(1.5, 0.4, 1);
        this.nameSprite.position.y = 1.7;
        this.group.add(this.nameSprite);
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setTouchInput(x, z) {
        this.touchMoveX = x;
        this.touchMoveZ = z;
    }

    setTouchJump(jumping) {
        this.touchJump = jumping;
    }

    update(dt, platforms, cameraYaw) {
        if (this.isDead) return;

        dt = Math.min(dt, 0.05);

        let moveX = 0;
        let moveZ = 0;

        // Keyboard input
        if (this.keys['ArrowUp'] || this.keys['KeyW']) moveZ -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) moveZ += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveX -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) moveX += 1;

        // Merge touch input
        if (Math.abs(this.touchMoveX) > 0.1 || Math.abs(this.touchMoveZ) > 0.1) {
            moveX = this.touchMoveX;
            moveZ = this.touchMoveZ;
        }

        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
            moveX /= len;
            moveZ /= len;
        }

        const sin = Math.sin(cameraYaw);
        const cos = Math.cos(cameraYaw);
        const rotatedX = moveX * cos - moveZ * sin;
        const rotatedZ = moveX * sin + moveZ * cos;

        this.velocity.x = rotatedX * this.moveSpeed;
        this.velocity.z = rotatedZ * this.moveSpeed;

        const wantJump = this.keys['Space'] || this.touchJump;
        if (wantJump && this.isGrounded && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.canJump = false;
        }
        if (!wantJump) {
            this.canJump = true;
        }

        this.velocity.y += this.gravity * dt;

        this.group.position.x += this.velocity.x * dt;
        this.group.position.y += this.velocity.y * dt;
        this.group.position.z += this.velocity.z * dt;

        this.isGrounded = false;
        this._checkCollisions(platforms);

        if (len > 0) {
            const targetAngle = Math.atan2(rotatedX, rotatedZ);
            let currentAngle = this.group.rotation.y;
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.group.rotation.y += diff * 0.15;
        }

        this._animateLimbs(len > 0, dt);

        if (this.group.position.y < -10) {
            this.die();
        }
    }

    _checkCollisions(platforms) {
        const pos = this.group.position;
        const halfW = this.width / 2;
        const halfD = this.depth / 2;
        const feetY = pos.y - 1.2;
        const headY = pos.y + 0.6;

        for (const plat of platforms) {
            const box = plat.box;
            if (!box) continue;

            const overlapX = (pos.x + halfW > box.minX) && (pos.x - halfW < box.maxX);
            const overlapZ = (pos.z + halfD > box.minZ) && (pos.z - halfD < box.maxZ);

            if (!overlapX || !overlapZ) continue;

            if (this.velocity.y <= 0 && feetY <= box.maxY && feetY + Math.abs(this.velocity.y * 0.05) >= box.maxY - 0.3) {
                if (pos.y - 0.5 > box.minY) {
                    pos.y = box.maxY + 1.2;
                    this.velocity.y = 0;
                    this.isGrounded = true;

                    if (plat.isMoving && plat.mesh) {
                        pos.x += plat.velocityX || 0;
                        pos.z += plat.velocityZ || 0;
                    }
                    continue;
                }
            }

            if (this.velocity.y > 0 && headY >= box.minY && headY - 0.3 <= box.minY) {
                this.velocity.y = 0;
                pos.y = box.minY - 0.6;
                continue;
            }

            const overlapY = (headY > box.minY) && (feetY < box.maxY);
            if (overlapY) {
                const pushLeft = box.minX - (pos.x + halfW);
                const pushRight = box.maxX - (pos.x - halfW);
                const pushFront = box.minZ - (pos.z + halfD);
                const pushBack = box.maxZ - (pos.z - halfD);

                const minPush = [
                    { axis: 'x', val: pushLeft, abs: Math.abs(pushLeft) },
                    { axis: 'x', val: pushRight, abs: Math.abs(pushRight) },
                    { axis: 'z', val: pushFront, abs: Math.abs(pushFront) },
                    { axis: 'z', val: pushBack, abs: Math.abs(pushBack) },
                ].sort((a, b) => a.abs - b.abs)[0];

                if (minPush.abs < 0.5) {
                    if (minPush.axis === 'x') {
                        pos.x += minPush.val;
                        this.velocity.x = 0;
                    } else {
                        pos.z += minPush.val;
                        this.velocity.z = 0;
                    }
                }
            }
        }
    }

    _animateLimbs(isMoving, dt) {
        if (isMoving && this.isGrounded) {
            const t = performance.now() * 0.008;
            const swing = Math.sin(t) * 0.6;
            this.leftArm.rotation.x = swing;
            this.rightArm.rotation.x = -swing;
            this.leftLeg.rotation.x = -swing;
            this.rightLeg.rotation.x = swing;
        } else if (!this.isGrounded) {
            this.leftArm.rotation.x = -0.3;
            this.rightArm.rotation.x = -0.3;
            this.leftLeg.rotation.x = 0.1;
            this.rightLeg.rotation.x = 0.1;
        } else {
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
        }
    }

    die() {
        this.deathCount++;
        this.respawn();
    }

    respawn() {
        this.group.position.copy(this.checkpoint);
        this.velocity.set(0, 0, 0);
        this.isGrounded = false;
    }

    setCheckpoint(position, index) {
        if (index > this.currentCheckpointIndex) {
            this.checkpoint.copy(position);
            this.checkpoint.y += 2;
            this.currentCheckpointIndex = index;
            return true;
        }
        return false;
    }

    reset() {
        this.group.position.set(0, 2, 0);
        this.velocity.set(0, 0, 0);
        this.checkpoint.set(0, 2, 0);
        this.isGrounded = false;
        this.isDead = false;
        this.deathCount = 0;
        this.currentCheckpointIndex = 0;
        this.group.rotation.y = 0;
    }

    getPosition() {
        return this.group.position;
    }
}
