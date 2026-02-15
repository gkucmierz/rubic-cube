export class Matrix4 {
  constructor() {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  static identity() {
    return new Matrix4();
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const result = new Matrix4();
    const r = result.elements;

    // a is row-major? No, CSS matrix3d is column-major.
    // Let's stick to column-major as per WebGL/CSS standard.
    // r[0] = a[0]*b[0] + a[4]*b[1] + a[8]*b[2] + a[12]*b[3] ...
    
    for (let i = 0; i < 4; i++) { // Column of B
      for (let j = 0; j < 4; j++) { // Row of A
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[j + k * 4] * b[i * 4 + k]; // Correct for column-major storage
        }
        r[j + i * 4] = sum;
      }
    }
    return result;
  }
  
  // Multiply this * other
  multiplySelf(other) {
    this.elements = this.multiply(other).elements;
    return this;
  }
  
  // Multiply other * this (pre-multiply)
  premultiply(other) {
    this.elements = other.multiply(this).elements;
    return this;
  }

  static translation(x, y, z) {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }

  static rotationX(angleRad) {
    const m = new Matrix4();
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    m.elements[5] = c;
    m.elements[6] = s;
    m.elements[9] = -s;
    m.elements[10] = c;
    return m;
  }

  static rotationY(angleRad) {
    const m = new Matrix4();
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    m.elements[0] = c;
    m.elements[2] = -s;
    m.elements[8] = s;
    m.elements[10] = c;
    return m;
  }

  static rotationZ(angleRad) {
    const m = new Matrix4();
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    m.elements[0] = c;
    m.elements[1] = s;
    m.elements[4] = -s;
    m.elements[5] = c;
    return m;
  }
  
  translate(x, y, z) {
    return this.multiplySelf(Matrix4.translation(x, y, z));
  }
  
  rotateX(deg) {
    return this.multiplySelf(Matrix4.rotationX(deg * Math.PI / 180));
  }
  
  rotateY(deg) {
    return this.multiplySelf(Matrix4.rotationY(deg * Math.PI / 180));
  }
  
  rotateZ(deg) {
    return this.multiplySelf(Matrix4.rotationZ(deg * Math.PI / 180));
  }

  toCSS() {
    // CSS matrix3d takes comma-separated values
    // Round to avoid scientific notation like 1e-15 which CSS hates
    const rounded = this.elements.map(v => Math.abs(v) < 1e-10 ? 0 : v);
    return `matrix3d(${rounded.join(',')})`;
  }
}
