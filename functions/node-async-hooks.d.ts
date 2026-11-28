// Il solo pezzo di Node usato (con nodejs_compat): senza tirare dentro tutti i tipi di Node
declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, fn: () => R): R
    getStore(): T | undefined
  }
}
