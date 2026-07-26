export class InputManager {
  constructor(canvas,onAction) {
    this.left=false; this.right=false; this.onAction=onAction;
    addEventListener("keydown",e => this.key(e,true));
    addEventListener("keyup",e => this.key(e,false));
    canvas.addEventListener("pointerdown",e => { e.preventDefault(); this.onAction("activate"); this.setPointer(e,canvas); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove",e => { if(e.buttons) this.setPointer(e,canvas); });
    canvas.addEventListener("pointerup",e => { this.left=this.right=false; try { canvas.releasePointerCapture(e.pointerId); } catch {} });
    canvas.addEventListener("pointercancel",() => this.left=this.right=false);
  }
  setPointer(e,canvas) { const x=(e.clientX-canvas.getBoundingClientRect().left)/canvas.getBoundingClientRect().width; this.left=x<.5; this.right=!this.left; }
  key(e,down) {
    if(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if(["ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    if(["ArrowLeft","KeyA"].includes(e.code)) this.left=down;
    if(["ArrowRight","KeyD"].includes(e.code)) this.right=down;
    if(down && !e.repeat) this.onAction(e.code);
  }
  axis() { return Number(this.right)-Number(this.left); }
}
