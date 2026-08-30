import Vector3 from './Vector3.js';

const G = 9.8;
const G_VEC = new Vector3(0, -G, 0);
const GAS_CST_R = 8.31447;  // N.m / (mol.K)
const AIR_MOLAR_MASS = 0.0289644;  // kg / mol
const SEALEVEL_TEMPERATURE = 288.15;  // K
const STATIC_PRESSURE_LVL0 = 101325.0;  // Pa
const TEMPERATURE_LAPSE_RATE_LVL0 = -0.0065;  // K / m
const PRESSURE_CST_H0 = G * AIR_MOLAR_MASS / (GAS_CST_R * TEMPERATURE_LAPSE_RATE_LVL0);

class BulletSim {
   constructor(mass, diam, dragCoeff, vel, pos, dir) {
      this.mass = mass;
      this.dragCoeff = dragCoeff;
      this.pos = pos;
      this.vel = dir.normalized().mul(vel);
      this.area = 0.25 * diam * diam * Math.PI;
      this.time = 0.0;
   }

   altitudeTemperature() {
      return SEALEVEL_TEMPERATURE + this.pos.y * TEMPERATURE_LAPSE_RATE_LVL0;
   }

   altitudePressure() {
      return STATIC_PRESSURE_LVL0 * Math.pow(SEALEVEL_TEMPERATURE / this.altitudeTemperature(), PRESSURE_CST_H0);
   }

   step() {
      const temperature = this.altitudeTemperature();
      const pressure = this.altitudePressure();
      const airDensity = AIR_MOLAR_MASS * pressure / (GAS_CST_R * temperature);
      const drag = this.area * 0.5 * this.dragCoeff * airDensity * this.vel.sqnorm();
      const acceleration = this.vel.normalized().mul(-drag / this.mass).add(G_VEC);

      /* Start with a time step of 160 ms, and when shell is about to land start halving
      the time step down to 10 ms. This ends the trajectory very close to the surface. */

      let dt = 0.16;
      while (this.pos.y + this.vel.y * dt * 2 < 0 && dt > 0.01)
         dt = Math.max(dt / 2, 0.01);

      this.pos.iadd(this.vel.mul(dt));
      this.vel.iadd(acceleration.mul(dt));
      this.time += dt;
   }
}

export default BulletSim;