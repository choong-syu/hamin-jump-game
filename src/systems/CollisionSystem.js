export function findLanding(player,platforms) {
  if(player.velocityY<=0) return null;
  const previous=player.getCollisionBox(true),current=player.getCollisionBox();
  return platforms.find(p => p.active&&p.visible&&previous.y+previous.height<=p.y&&current.y+current.height>=p.y&&current.x+current.width>p.x&&current.x<p.x+p.width) || null;
}
