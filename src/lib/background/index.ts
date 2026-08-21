import { BackgroundEngine } from "./background-engine";
import { BackgroundPreloader } from "./background-preloader";
import { BackgroundRotation } from "./background-rotation";

export const backgroundEngine = new BackgroundEngine();
export const backgroundPreloader = new BackgroundPreloader();
export const backgroundRotation = new BackgroundRotation(
  () => backgroundEngine.list(),
  () => backgroundEngine.next(),
);

export * from "./background-engine";
export * from "./background-cache";
export * from "./background-preloader";
export * from "./background-rotation";
