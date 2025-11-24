/**
 * 3D CASE MODEL
 * Three.js-based 3D case with:
 * - Rotating animation
 * - Material/texture simulation
 * - Lock mechanism
 * - Glow effect
 * - Responsive sizing
 */

import * as THREE from 'three';

class CaseModel3D {
  constructor(container, options = {}) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Options
    this.caseName = options.caseName || 'Premium Case';
    this.caseColor = options.caseColor || 0xff006e;
    this.glowColor = options.glowColor || 0x00f0ff;
    this.isRotating = options.rotating || false;

    // Three.js setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    container.appendChild(this.renderer.domElement);

    // Camera position
    this.camera.position.z = 3;

    // Lighting
    this.setupLighting();

    // Create case
    this.caseGroup = new THREE.Group();
    this.scene.add(this.caseGroup);

    this.createCase();
    this.createLock();
    this.createGlow();

    // Animation
    this.rotationSpeed = 0.003;
    this.lockOpen = 0; // 0-1, animation state
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light (key light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Point light (fill, cyberpunk glow)
    const pointLight = new THREE.PointLight(this.glowColor, 0.5);
    pointLight.position.set(-3, 3, 3);
    this.scene.add(pointLight);
  }

  createCase() {
    // Main case body (rounded box)
    const geometry = new THREE.BoxGeometry(1.2, 1.6, 0.8);

    // Create material with glowing edges
    const material = new THREE.MeshStandardMaterial({
      color: this.caseColor,
      metalness: 0.6,
      roughness: 0.3,
      emissive: this.caseColor,
      emissiveIntensity: 0.2,
    });

    this.caseMesh = new THREE.Mesh(geometry, material);

    // Round corners (use BufferGeometry for custom edges)
    const roundedBoxGeometry = this.createRoundedBoxGeometry(1.2, 1.6, 0.8, 0.1, 8);
    this.caseMesh.geometry = roundedBoxGeometry;

    this.caseGroup.add(this.caseMesh);

    // Add edge glow
    const edges = new THREE.EdgesGeometry(roundedBoxGeometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: this.glowColor, linewidth: 2 })
    );
    this.caseGroup.add(line);

    // Add details (lines on case)
    this.addCaseDetails();
  }

  createRoundedBoxGeometry(width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const positions = geometry.attributes.position;

    // Simple corner rounding (displace vertices)
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Normalize and apply rounding
      let nx = x / (width / 2);
      let ny = y / (height / 2);
      let nz = z / (depth / 2);

      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (length > 1) {
        nx /= length;
        ny /= length;
        nz /= length;
      }

      positions.setXYZ(i, nx * width / 2, ny * height / 2, nz * depth / 2);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  addCaseDetails() {
    // Add subtle details to case (lines, panels)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.glowColor,
      linewidth: 1,
      transparent: true,
      opacity: 0.5,
    });

    // Vertical lines on front
    for (let i = -2; i <= 2; i++) {
      const points = [
        new THREE.Vector3((i * 0.3), 0.8, 0.4),
        new THREE.Vector3((i * 0.3), -0.8, 0.4),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      this.caseGroup.add(line);
    }
  }

  createLock() {
    // Padlock on front of case
    const lockGroup = new THREE.Group();

    // Lock body
    const lockGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.05);
    const lockMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.lockBody = new THREE.Mesh(lockGeometry, lockMaterial);
    this.lockBody.position.z = 0.5;
    this.lockBody.position.y = -0.3;
    lockGroup.add(this.lockBody);

    // Lock shackle (opens up when unlocked)
    const shackleGeometry = new THREE.TorusGeometry(0.12, 0.03, 16, 32, Math.PI);
    const shackleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.lockShackle = new THREE.Mesh(shackleGeometry, shackleMaterial);
    this.lockShackle.position.z = 0.5;
    this.lockShackle.position.y = -0.1;
    lockGroup.add(this.lockShackle);

    this.caseGroup.add(lockGroup);
    this.lockGroup = lockGroup;
  }

  createGlow() {
    // Outer glow bloom effect
    const glowGeometry = new THREE.BoxGeometry(1.3, 1.7, 0.9);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.1,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.caseGroup.add(this.glowMesh);
  }

  /**
   * Start rotating case
   */
  startRotating() {
    this.isRotating = true;
  }

  /**
   * Stop rotating case
   */
  stopRotating() {
    this.isRotating = false;
  }

  /**
   * Animate lock opening (plays when item is revealed)
   */
  openLock() {
    this.lockOpening = true;
    this.lockOpenProgress = 0;
  }

  /**
   * Play impact effect (vibration in 3D space)
   */
  playImpact() {
    // Use small deterministic impact offsets (avoid Math.random in visuals)
    this.caseGroup.position.x = 0.03;
    this.caseGroup.position.y = -0.03;

    setTimeout(() => {
      this.caseGroup.position.x = 0;
      this.caseGroup.position.y = 0;
    }, 50);
  }

  /**
   * Animate light beam
   */
  createLightBeam() {
    const beamGeometry = new THREE.ConeGeometry(0.3, 2, 32);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.3,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.z = 2;
    this.scene.add(beam);

    // Animate beam away
    let progress = 0;
    const animateBeam = () => {
      progress += 0.05;
      beam.position.z += 0.1;
      beam.material.opacity = Math.max(0, 0.3 - progress * 0.3);

      if (progress < 1) {
        requestAnimationFrame(animateBeam);
      } else {
        this.scene.remove(beam);
      }
    };
    animateBeam();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate case
    if (this.isRotating) {
      this.caseGroup.rotation.y += this.rotationSpeed;
      this.caseGroup.rotation.x += this.rotationSpeed * 0.5;
    }

    // Animate lock opening
    if (this.lockOpening) {
      this.lockOpenProgress = Math.min(1, this.lockOpenProgress + 0.02);

      if (this.lockOpenProgress < 1) {
        // Shackle rotates open
        this.lockShackle.rotation.z = -this.lockOpenProgress * Math.PI * 0.5;
      } else {
        this.lockOpening = false;
      }
    }

    // Subtle glow pulse
    const time = Date.now() * 0.001;
    this.glowMesh.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const newWidth = this.container.clientWidth;
    const newHeight = this.container.clientHeight;

    this.camera.aspect = newWidth / newHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(newWidth, newHeight);
  }

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

export default CaseModel3D;
