document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen when A-Frame is ready
    const scene = document.querySelector('a-scene');
    scene.addEventListener('loaded', () => {
        const loading = document.getElementById('loading');
        loading.style.opacity = '0';
        setTimeout(() => loading.style.display = 'none', 500);
        
        // Initialize simulation for all 3 beakers
        initSimulation();
    });

    // Particle Configuration
    const config = {
        solution: {
            particleSize: 0.015,
            particleCount: 50,
            particleColor: "#ff0000",
            particleSpeed: 0.025,
            hasSettling: false,
            containerId: "particles-solution",
            liquidId: "liquid-solution"
        },
        colloid: {
            particleSize: 0.04,
            particleCount: 80,
            particleColor: "#ff0000",
            particleSpeed: 0.015,
            hasSettling: false,
            containerId: "particles-colloid",
            liquidId: "liquid-colloid"
        },
        suspension: {
            particleSize: 0.08,
            particleCount: 60,
            particleColor: "#ff0000",
            particleSpeed: 0.01,
            hasSettling: true,
            containerId: "particles-suspension",
            liquidId: "liquid-suspension"
        }
    };

    let systems = [];

    function initSimulation() {
        // Create particle systems for each beaker
        systems.push(createParticles(config.solution));
        systems.push(createParticles(config.colloid));
        systems.push(createParticles(config.suspension));

        // Start global animation loop
        animate();
    }

    function createParticles(setup) {
        const container = document.getElementById(setup.containerId);
        const liquid = document.getElementById(setup.liquidId);
        let particles = [];

        const radius = 0.7; // Internal scaled radius
        const height = 1.0; 

        for (let i = 0; i < setup.particleCount; i++) {
            const particle = document.createElement('a-sphere');
            
            // Random position inside cylinder
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const px = r * Math.cos(angle);
            const pz = r * Math.sin(angle);
            const py = (Math.random() - 0.5) * height; // Centered around 0

            particle.setAttribute('radius', setup.particleSize);
            particle.setAttribute('color', setup.particleColor);
            particle.setAttribute('position', `${px} ${py} ${pz}`);
            particle.setAttribute('roughness', '0.5');

            container.appendChild(particle);

            particles.push({
                el: particle,
                x: px,
                y: py,
                z: pz,
                vx: (Math.random() - 0.5) * setup.particleSpeed,
                vy: (Math.random() - 0.5) * setup.particleSpeed,
                vz: (Math.random() - 0.5) * setup.particleSpeed,
                isSettled: false
            });
        }

        return {
            config: setup,
            particles: particles,
            liquid: liquid,
            settledCount: 0
        };
    }

    function animate() {
        const height = 1.0;
        const radius = 0.7;
        const bottomY = -0.5;

        // Process each system (Solution, Colloid, Suspension)
        for (let s = 0; s < systems.length; s++) {
            const sys = systems[s];
            const state = sys.config;
            let currentSettled = 0;

            for (let i = 0; i < sys.particles.length; i++) {
                let p = sys.particles[i];

                if (p.isSettled) {
                    currentSettled++;
                    continue;
                }

                if (state.hasSettling) {
                    // Suspensions settle downwards due to gravity
                    p.vy -= 0.0005; // Gravity
                    p.vx *= 0.98; // Dampening
                    p.vz *= 0.98;
                } else {
                    // Brownian motion / random jitter
                    p.vx += (Math.random() - 0.5) * 0.005;
                    p.vy += (Math.random() - 0.5) * 0.005;
                    p.vz += (Math.random() - 0.5) * 0.005;
                    
                    // Limit speed
                    const speedLimit = state.particleSpeed;
                    p.vx = Math.max(Math.min(p.vx, speedLimit), -speedLimit);
                    p.vy = Math.max(Math.min(p.vy, speedLimit), -speedLimit);
                    p.vz = Math.max(Math.min(p.vz, speedLimit), -speedLimit);
                }

                // Update position
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;

                // Boundaries (Cylinder Walls)
                const currentR = Math.sqrt(p.x * p.x + p.z * p.z);
                if (currentR > radius) {
                    // Bounce off walls
                    const normalX = p.x / currentR;
                    const normalZ = p.z / currentR;
                    const dotProduct = p.vx * normalX + p.vz * normalZ;
                    p.vx -= 2 * dotProduct * normalX;
                    p.vz -= 2 * dotProduct * normalZ;
                    
                    // Bring back inside
                    p.x = normalX * radius;
                    p.z = normalZ * radius;
                }

                // Top boundary
                if (p.y > height / 2) {
                    p.y = height / 2;
                    p.vy *= -1;
                }

                // Bottom boundary
                if (p.y < bottomY) {
                    if (state.hasSettling) {
                        // Create a visible pile at the bottom
                        const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z);
                        const pileHeight = Math.max(0, (1 - distFromCenter/radius) * 0.15);
                        p.y = bottomY + (Math.random() * 0.05) + pileHeight; 
                        p.vy = 0;
                        p.vx = 0;
                        p.vz = 0;
                        p.isSettled = true;
                    } else {
                        p.y = bottomY;
                        p.vy *= -1;
                    }
                }

                p.el.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
            }

            // Specific updates for suspension liquid clarity
            if (state.hasSettling && currentSettled > 0) {
                const ratio = currentSettled / state.particleCount;
                if (ratio > 0.3) {
                    // Base color was #D2B48C, opacity 0.9
                    // Reduce opacity to make it clear out as sediment settles
                    sys.liquid.setAttribute('opacity', Math.max(0.3, 0.9 - (ratio - 0.3) * 1.2));
                }
            }
        }

        requestAnimationFrame(animate);
    }
});
