export function findLanding(player,platforms) {
  if(player.velocityY<=0) return null;
  const previous=player.getCollisionBox(true),current=player.getCollisionBox();
  const centerX=current.x+current.width/2;
  return platforms.find(platform => {
    if(!platform.active||!platform.visible||current.x+current.width<=platform.x||current.x>=platform.x+platform.width)return false;
    const surfaceY=platform.getSurfaceY?platform.getSurfaceY(centerX):platform.y;
    return previous.y+previous.height<=surfaceY+6&&current.y+current.height>=surfaceY;
  }) || null;
}
