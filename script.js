// --- Game Setup & Variables ---
let scene, camera, renderer;
let player, arena;
let keys = { w: false, a: false, s: false, d: false };
let score = 0;

// Arrays to hold game objects
let projectiles = [];
let enemies = [];

// Gameplay Configuration
const ARENA_SIZE = 40;
const PLAYER_SPEED = 0.15;
const BOUNCE_HEIGHT = 4;
const BOUNCE_SPEED = 0.08;

let bounceTimer = 0;

// --- Initialization ---
function init() {
    // 1. Scene & Renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0933); // Dark neon purple vibe
    scene.fog = new THREE.FogExp2(0x1a0933, 0.025);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 3. The Floor (Arena)
    const floorGeo = new THREE.BoxGeometry(ARENA_SIZE, 2, ARENA_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4 });
    arena = new THREE.Mesh(floorGeo, floorMat);
    arena.position.y = -1; // Top surface at y=0
    arena.receiveShadow = true;
    scene.add(arena);

    // Grid overlay for depth perception
    const grid = new THREE.GridHelper(ARENA_SIZE, 40, 0x00ffff, 0x444455);
    grid.position.y = 0.01;
    scene.add(grid);

    // 4. The Player (A shiny bouncy ball)
    const playerGeo = new THREE.SphereGeometry(1, 32, 32);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.1, metalness: 0.1 });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    player.position.set(0, 1, 0);
    scene.add(player);

    // Spawn initial enemies
    for(let i = 0; i < 8; i++) spawnEnemy();

    // 5. Input Listeners
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    window.addEventListener('click', shootProjectile);
    window.addEventListener('resize', onWindowResize);

    // Start loop
    animate();
}

// --- Controls & Inputs ---
function handleKey(e, isDown) {
    let key = e.key.toLowerCase();
    if (key === 'w' || e.key === 'ArrowUp') keys.w = isDown;
    if (key === 'a' || e.key === 'ArrowLeft') keys.a = isDown;
    if (key === 's' || e.key === 'ArrowDown') keys.s = isDown;
    if (key === 'd' || e.key === 'ArrowRight') keys.d = isDown;
}

function shootProjectile(e) {
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, targetPoint);

    let direction = new THREE.Vector3().subVectors(targetPoint, player.position);
    direction.y = 0; 
    direction.normalize();

    const projGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const projMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const proj = new THREE.Mesh(projGeo, projMat);
    
    proj.position.copy(player.position);
    scene.add(proj);

    projectiles.push({
        mesh: proj,
        dir: direction,
        speed: 0.4,
        life: 120 
    });
}

// --- Game Entities ---
function spawnEnemy() {
    const size = 1.5;
    const enemyGeo = new THREE.BoxGeometry(size, size, size);
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
    const mesh = new THREE.Mesh(enemyGeo, enemyMat);
    mesh.castShadow = true;

    let x = (Math.random() - 0.5) * (ARENA_SIZE - 4);
    let z = (Math.random() - 0.5) * (ARENA_SIZE - 4);
    if(Math.abs(x) < 5) x += 6; 
    if(Math.abs(z) < 5) z += 6; 

    mesh.position.set(x, size/2, z);
    scene.add(mesh);

    enemies.push({
        mesh: mesh,
        dir: new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize(),
        speed: 0.03 + Math.random() * 0.04
    });
}

// --- Main Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    // 1. Continuous Auto Bouncing
    bounceTimer += BOUNCE_SPEED;
    player.position.y = 1 + Math.abs(Math.sin(bounceTimer)) * BOUNCE_HEIGHT;
    
    let scaleY = 1 + (Math.cos(bounceTimer * 2) * 0.15);
    player.scale.set(1 / Math.sqrt(scaleY), scaleY, 1 / Math.sqrt(scaleY));

    // 2. Player Movement Input
    if (keys.w) player.position.z -= PLAYER_SPEED;
    if (keys.s) player.position.z += PLAYER_SPEED;
    if (keys.a) player.position.x -= PLAYER_SPEED;
    if (keys.d) player.position.x += PLAYER_SPEED;

    const halfArena = ARENA_SIZE / 2 - 1;
    player.position.x = Math.max(-halfArena, Math.min(halfArena, player.position.x));
    player.position.z = Math.max(-halfArena, Math.min(halfArena, player.position.z));

    // 3. Third-Person Camera Tracking
    camera.position.set(player.position.x, player.position.y + 12, player.position.z + 18);
    camera.lookAt(player.position.x, player.position.y, player.position.z);

    // 4. Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.mesh.position.addScaledVector(p.dir, p.speed);
        p.life--;

        if (p.life <= 0 || Math.abs(p.mesh.position.x) > ARENA_SIZE/2 || Math.abs(p.mesh.position.z) > ARENA_SIZE/2) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let distance = p.mesh.position.distanceTo(e.mesh.position);
            
            if (distance < 1.5) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);

                scene.remove(e.mesh);
                enemies.splice(j, 1);
                spawnEnemy();

                score += 10;
                document.getElementById('score').innerText = score;
                break;
            }
        }
    }

    // 5. Update and Move Enemies
    enemies.forEach(e => {
        e.mesh.position.addScaledVector(e.dir, e.speed);
        e.mesh.rotation.y += 0.02;

        const boundary = ARENA_SIZE / 2 - 1;
        if (Math.abs(e.mesh.position.x) > boundary) {
            e.dir.x *= -1;
            e.mesh.position.x = Math.sign(e.mesh.position.x) * boundary;
        }
        if (Math.abs(e.mesh.position.z) > boundary) {
            e.dir.z *= -1;
            e.mesh.position.z = Math.sign(e.mesh.position.z) * boundary;
        }
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize game on load
window.onload = init;
