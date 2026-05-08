// https://github.com/sveltejs/svelte/issues/11423#issuecomment-2090828600

export class ExternalState<T> {
  #data: T;
  #marker = $state(false);

  constructor(data: T) {
    this.#data = data;
  }
  get data() {
    this.#marker;
    return this.#data;
  }
  set data(_data: T) {
    this.#marker = !this.#marker;
    this.#data = _data;
  }
  invalidate() {
    this.#marker = !this.#marker;
  }
}
