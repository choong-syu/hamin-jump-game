import { getLevelForScore } from "../config.js";
export function detectLevelChange(score,currentLevel) { const next=getLevelForScore(score);return next.level!==currentLevel.level?next:null; }
