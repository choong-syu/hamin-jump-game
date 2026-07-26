import { CAMERA_THRESHOLD } from "../config.js";
export function updateCamera(player,platformManager) {
  if(player.y>=CAMERA_THRESHOLD) return 0;
  const amount=CAMERA_THRESHOLD-player.y;player.y=CAMERA_THRESHOLD;player.previousY+=amount;platformManager.scroll(amount);return amount;
}
