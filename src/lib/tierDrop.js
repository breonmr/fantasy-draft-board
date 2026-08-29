export function destinationTierAtPointer(pointerY, playerRects, dividerRects, draggedId) {
  const visiblePlayers = playerRects.filter((item) => item.id !== draggedId);
  const dividers = dividerRects
    .filter((divider) => Number.isInteger(divider.tier) && divider.tier >= 1)
    .sort((a, b) => a.top - b.top);

  const containingPlayer = visiblePlayers.find((item) => pointerY >= item.top && pointerY <= item.bottom);
  if (containingPlayer?.tier) return containingPlayer.tier;

  const containingDivider = dividers.find((divider) => pointerY >= divider.top && pointerY <= divider.bottom);
  if (containingDivider) return containingDivider.tier;

  const previous = [...visiblePlayers].reverse().find((item) => item.mid < pointerY);
  const next = visiblePlayers.find((item) => item.mid >= pointerY);
  const dividerBetween = dividers.find((divider) => (
    (!previous || divider.top >= previous.bottom) && (!next || divider.bottom <= next.top)
  ));

  if (dividerBetween) {
    return pointerY < (dividerBetween.top + dividerBetween.bottom) / 2
      ? previous?.tier ?? (dividerBetween.index === 0 ? dividerBetween.tier : null)
      : dividerBetween.tier;
  }
  if (!previous && next?.tier) return next.tier;
  if (!next && previous?.tier) return previous.tier;
  if (previous?.tier && previous.tier === next?.tier) return previous.tier;
  return null;
}
