// ═══════════════════════════════════════════════════════════
// 3D Background — Three.js animated wireframe plane
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

/**
 * Initialize the 3D background scene
 * @param {HTMLElement} container
 * @returns {{ pulse: (hex: number) => void, destroy: () => void }}
 */
export function initBackground(container) {
  let destroyed = false;

  try {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030303, 0.025);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 25);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Wireframe plane
    const material = new THREE.MeshBasicMaterial({
      color: 0xff1e1e,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 100, 36, 36),
      material
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -10;
    scene.add(plane);

    // Particles
    const particleCount = 300;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 100;
      particlePositions[i + 1] = (Math.random() - 0.5) * 50;
      particlePositions[i + 2] = (Math.random() - 0.5) * 100;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: 0.1,
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      })
    );
    scene.add(particles);

    let mouseX = 0;
    let mouseY = 0;
    let waveHeight = 1.5;
    let waveSpeed = 0.5;

    const onMouseMove = (e) => {
      mouseX = e.clientX - window.innerWidth / 2;
      mouseY = e.clientY - window.innerHeight / 2;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    const positions = plane.geometry.attributes.position;
    const clock = new THREE.Clock();

    function loop() {
      if (destroyed) return;
      requestAnimationFrame(loop);
      if (document.hidden) return;

      const t = clock.getElapsedTime();

      // Smooth camera follow
      camera.position.x += (mouseX * 0.01 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 0.01 + 5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Rotate particles
      particles.rotation.y += 0.0005;

      // Wave effect on plane
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(
          i,
          Math.sin(positions.getX(i) * 0.1 + t * waveSpeed) * waveHeight +
            Math.cos(positions.getY(i) * 0.1 + t * waveSpeed) * waveHeight
        );
      }
      positions.needsUpdate = true;

      // Dampen pulse
      waveHeight += (1.5 - waveHeight) * 0.05;
      waveSpeed += (0.5 - waveSpeed) * 0.05;

      renderer.render(scene, camera);
    }
    loop();

    /**
     * Pulse effect — triggered on add/delete
     * @param {number} hex - color hex
     */
    function pulse(hex) {
      waveHeight = 4.2;
      waveSpeed = 1.8;
      material.color.setHex(hex);
      material.opacity = 0.45;
      setTimeout(() => {
        material.color.setHex(0xff1e1e);
        material.opacity = 0.15;
      }, 600);
    }

    function destroy() {
      destroyed = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    }

    return { pulse, destroy };
  } catch (e) {
    console.warn('3D background not available:', e);
    return {
      pulse: () => {},
      destroy: () => {},
    };
  }
}
