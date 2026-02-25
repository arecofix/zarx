// Shim for @angular/fire module.hot ReferenceError in Node ESM
if (typeof module === 'undefined' || !(globalThis as any).module) {
    (globalThis as any).module = { hot: false };
}
