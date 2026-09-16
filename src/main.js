import { createSSRApp } from "vue";
import App from "./App.vue";

function patchHideLoading() {
  if (typeof uni === 'undefined' || typeof uni.hideLoading !== 'function') {
    return;
  }
  const originalHideLoading = uni.hideLoading;
  uni.hideLoading = function patchedHideLoading(...args) {
    try {
      return originalHideLoading.apply(this, args);
    } catch (err) {
      const msg = err?.errMsg || err?.message || '';
      if (msg && msg.includes("toast can't be found")) {
        console.warn('hideLoading: 未找到正在显示的loading，已忽略');
        return;
      }
      throw err;
    }
  };
}

export function createApp() {
  patchHideLoading();
  const app = createSSRApp(App);
  return {
    app,
  };
}
