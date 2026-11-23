// Seeded randomness: the same seed gives the same numbers, on every JS engine.
//
// The generator is mulberry32 (Tommy Ettinger, 2017): a 32-bit state stepped by
// a constant and hashed. Only integer arithmetic (Math.imul, shifts, xor)
// touches the bits, so no engine's float library can change them. The helpers
// add only + - * / and sqrt, which IEEE 754 rounds the same everywhere. (A
// sin-hash is not safe: Math.sin differs in its last bits between engines.)

/** murmur3's finalizer: spreads every input bit over every output bit. */
function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const bits = new DataView(new ArrayBuffer(8));

/**
 * A seed of any number, as 32 well-mixed bits. Every bit of the float counts, so 1, 1.5 and -1 are
 * different trees; 0 and -0 are the same one.
 */
export function hashSeed(seed: number): number {
  bits.setFloat64(0, Number.isFinite(seed) && seed !== 0 ? seed : 0, true);
  return mix32(mix32(bits.getUint32(0, true) ^ 0x9e3779b9) ^ bits.getUint32(4, true));
}

export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = hashSeed(seed);
  }

  /** The next 32 bits, as an unsigned integer. */
  u32(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    return this.u32() / 4294967296;
  }

  /** Uniform in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** A whole number from 0 to n - 1. */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /**
   * Near enough a normal deviate (mean 0, spread 1): the sum of four uniforms (Irwin and Hall), which
   * never strays past ±3.5, so one wild draw cannot throw a branch across the crown.
   */
  gauss(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.7320508075688772;
  }

  /**
   * A direction, uniform over the sphere (Marsaglia 1972: a point in the unit disc, lifted). The disc
   * takes 4 draws in 5; the loop is bounded all the same, and its way out is never taken in practice.
   */
  onSphere(): [number, number, number] {
    for (let i = 0; i < 64; i++) {
      const a = 2 * this.next() - 1;
      const b = 2 * this.next() - 1;
      const s = a * a + b * b;
      if (s >= 1 || s === 0) continue;
      const k = 2 * Math.sqrt(1 - s);
      return [a * k, 1 - 2 * s, b * k];
    }
    return [0, 1, 0];
  }

  /** A point uniform in the unit disc, as [x, z]. */
  inDisc(): [number, number] {
    for (let i = 0; i < 64; i++) {
      const a = 2 * this.next() - 1;
      const b = 2 * this.next() - 1;
      if (a * a + b * b < 1) return [a, b];
    }
    return [0, 0];
  }

  /** A new stream from this one, so one part of growing can draw more or less without moving the rest. */
  fork(): Random {
    return new Random(this.u32());
  }
}
