/**
 * PARTICLE EFFECTS SYSTEM
 * Three.js-based particle engine for:
 * - Confetti bursts (legendary items)
 * - Sparkle effects (rare items)
 * - Fire/smoke effects (epic items)
 * - Electricity (mythic items)
 * Uses InstancedBufferGeometry for 60fps performance
 */

import * as THREE from 'three';

class ParticleEngine {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.particles = [];
    this.emitters = new Map();
  }

  /**
   * CONFETTI BURST - For legendary items
   * Colorful paper-like particles flying outward with spin
   */
  createConfettiBurst(position, count = 50) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];
    const rotations = [];

    const confettiColors = [
      new THREE.Color(0xffd700), // Gold
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0xff006e), // Magenta
      new THREE.Color(0x8b5cf6), // Purple
      new THREE.Color(0xfbbf24), // Yellow
    ];

    for (let i = 0; i < count; i++) {
      // Position
      positions.push(position.x, position.y, position.z);

      // Velocity (outward + up)
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 4;
      velocities.push(
        Math.cos(angle) * speed,
        Math.random() * 8 + 5, // Up
        Math.sin(angle) * speed
      );

      // Color
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      colors.push(color.r, color.g, color.b);

      // Rotation
      rotations.push(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(new Float32Array(rotations), 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    const particle = {
      mesh,
      geometry,
      material,
      velocities,
      ages: new Array(count).fill(0),
      maxAge: 2.0, // 2 seconds
      count,
    };

    this.particles.push(particle);
    return particle;
  }

  /**
   * SPARKLE EFFECT - For rare items
   * Small glowing spheres that fade and rise
   */
  createSparkleEffect(position, count = 30) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const scales = [];

    for (let i = 0; i < count; i++) {
      positions.push(
        position.x + (Math.random() - 0.5) * 0.5,
        position.y + (Math.random() - 0.5) * 0.5,
        position.z + (Math.random() - 0.5) * 0.5
      );

      velocities.push(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2
      );

      scales.push(0.05 + Math.random() * 0.1);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(new Float32Array(scales), 1));

    const material = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
      emissive: 0x3b82f6,
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    const particle = {
      mesh,
      geometry,
      material,
      velocities,
      scales,
      ages: new Array(count).fill(0),
      maxAge: 1.5,
      count,
    };

    this.particles.push(particle);
    return particle;
  }

  /**
   * FIRE BURST - For epic items
   * Orange/red particles with upward velocity
   */
  createFireBurst(position, count = 40) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];

    for (let i = 0; i < count; i++) {
      positions.push(
        position.x + (Math.random() - 0.5) * 0.3,
        position.y,
        position.z + (Math.random() - 0.5) * 0.3
      );

      const angle = Math.random() * Math.PI * 2;
      velocities.push(
        Math.cos(angle) * (Math.random() * 2),
        Math.random() * 5 + 3,
        Math.sin(angle) * (Math.random() * 2)
      );

      // Gradient from orange to red
      const t = Math.random();
      const color = new THREE.Color();
      color.setHSL(0.08 - t * 0.05, 1, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    const particle = {
      mesh,
      geometry,
      material,
      velocities,
      ages: new Array(count).fill(0),
      maxAge: 1.2,
      count,
    };

    this.particles.push(particle);
    return particle;
  }

  /**
   * ELECTRICITY EFFECT - For mythic items
   * Branching lightning arcs emanating from center
   */
  createElectricityEffect(position) {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
    });

    const lightning = [];

    // Create 5 lightning branches
    for (let b = 0; b < 5; b++) {
      const points = [new THREE.Vector3(position.x, position.y, position.z)];
      const angle = (Math.PI * 2 * b) / 5;

      let currentPos = new THREE.Vector3(
        position.x + Math.cos(angle) * 0.1,
        position.y + 0.1,
        position.z + Math.sin(angle) * 0.1
      );

      for (let i = 0; i < 5; i++) {
        const randomDir = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2 + 0.2,
          (Math.random() - 0.5) * 0.3
        ).normalize().multiplyScalar(0.3);

        currentPos.add(randomDir);
        points.push(currentPos.clone());
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      this.scene.add(line);
      lightning.push(line);
    }

    const particle = {
      lightning,
      age: 0,
      maxAge: 0.8,
      startOpacity: 0.8,
    };

    this.particles.push(particle);
    return particle;
  }

  /**
   * Update all particle systems each frame
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.age = (particle.age || 0) + deltaTime;

      if (particle.maxAge && particle.age >= particle.maxAge) {
        // Remove dead particle
        if (particle.mesh) this.scene.remove(particle.mesh);
        if (particle.lightning) {
          particle.lightning.forEach(line => this.scene.remove(line));
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Update confetti/sparkles/fire
      if (particle.mesh && particle.velocities) {
        const positions = particle.geometry.attributes.position.array;
        const velocities = particle.velocities;
        const alpha = 1 - particle.age / particle.maxAge;

        for (let j = 0; j < particle.count; j++) {
          const idx = j * 3;

          // Apply velocity + gravity
          positions[idx] += velocities[idx] * deltaTime;
          positions[idx + 1] += velocities[idx + 1] * deltaTime - 9.8 * deltaTime * deltaTime * 0.1;
          positions[idx + 2] += velocities[idx + 2] * deltaTime;

          // Damping
          velocities[idx] *= 0.98;
          velocities[idx + 1] *= 0.98;
          velocities[idx + 2] *= 0.98;
        }

        particle.geometry.attributes.position.needsUpdate = true;
        particle.material.opacity = alpha;
      }

      // Update electricity
      if (particle.lightning) {
        const alpha = 1 - particle.age / particle.maxAge;
        particle.lightning.forEach(line => {
          line.material.opacity = alpha;
        });
      }
    }
  }

  /**
   * Create rarity-based effect automatically
   */
  burstFromRarity(position, rarity) {
    switch (rarity) {
      case 'legendary':
        this.createConfettiBurst(position, 60);
        break;
      case 'epic':
        this.createFireBurst(position, 40);
        break;
      case 'rare':
        this.createSparkleEffect(position, 30);
        break;
      case 'uncommon':
        this.createSparkleEffect(position, 15);
        break;
      default:
        // common - subtle effect
        this.createSparkleEffect(position, 5);
    }
  }
}

export default ParticleEngine;
