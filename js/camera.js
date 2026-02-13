class GameCamera {
    constructor(camera, isTouchDevice) {
        this.camera = camera;
        this.yaw = 0;
        this.pitch = 0.3;
        this.distance = 8;
        this.minPitch = -0.5;
        this.maxPitch = 1.2;
        this.sensitivity = 0.003;
        this.touchSensitivity = 0.005;
        this.smoothing = 0.08;
        this.isTouchDevice = isTouchDevice || false;

        this.targetPosition = new THREE.Vector3();
        this.isLocked = false;

        // Touch camera state
        this.cameraTouchId = null;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        if (!this.isTouchDevice) {
            this._setupMouseControls();
        }
        this._setupTouchCamera();
    }

    _setupMouseControls() {
        const canvas = document.querySelector('canvas');

        document.addEventListener('click', () => {
            if (!this.isLocked && document.pointerLockElement === null) {
                canvas?.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement !== null;
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                crosshair.style.display = this.isLocked ? 'block' : 'none';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            this.yaw -= e.movementX * this.sensitivity;
            this.pitch += e.movementY * this.sensitivity;
            this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        });
    }

    _setupTouchCamera() {
        const area = document.getElementById('camera-touch-area');
        if (!area) return;

        area.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.cameraTouchId !== null) return;
            const touch = e.changedTouches[0];
            this.cameraTouchId = touch.identifier;
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
        }, { passive: false });

        area.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.cameraTouchId) {
                    const dx = touch.clientX - this.lastTouchX;
                    const dy = touch.clientY - this.lastTouchY;
                    this.yaw -= dx * this.touchSensitivity;
                    this.pitch += dy * this.touchSensitivity;
                    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
                    this.lastTouchX = touch.clientX;
                    this.lastTouchY = touch.clientY;
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.cameraTouchId) {
                    this.cameraTouchId = null;
                }
            }
        };
        area.addEventListener('touchend', endTouch);
        area.addEventListener('touchcancel', endTouch);
    }

    update(playerPosition) {
        const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
        const offsetY = Math.sin(this.pitch) * this.distance;
        const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;

        this.targetPosition.set(
            playerPosition.x + offsetX,
            playerPosition.y + 1 + offsetY,
            playerPosition.z + offsetZ
        );

        this.camera.position.lerp(this.targetPosition, this.smoothing);

        const lookAt = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 0.5,
            playerPosition.z
        );
        this.camera.lookAt(lookAt);
    }

    getYaw() {
        return this.yaw;
    }

    reset() {
        this.yaw = 0;
        this.pitch = 0.3;
    }
}
