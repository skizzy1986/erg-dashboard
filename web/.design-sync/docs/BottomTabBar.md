---
category: Navigation
---

# BottomTabBar

The mobile bottom navigation. Six fixed tabs — Analytics, Live, Log, Strength,
Recovery, Coach — each an emoji glyph over a small tracked caption. The tab list
is internal to the component; it is not configurable by props.

The active tab is bolded and switched to `THEME.positive`; inactive tabs stay muted.
The bar is `position: fixed` to the bottom of the viewport at `z-index: 100`,
56px tall, and pads itself with `env(safe-area-inset-bottom)` for notched
devices — so page content underneath needs its own bottom padding to clear it.

```jsx
<BottomTabBar activeTab="log" onTabChange={setTab} />
```
