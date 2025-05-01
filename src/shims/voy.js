import wasm from "voy-search/voy_search_bg.wasm";
import * as voy from "voy-search/voy_search_bg.js";
const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), {
  "./voy_search_bg.js": voy,
});
voy.__wbg_set_wasm(instance.exports);
export * from "voy-search/voy_search_bg.js";
