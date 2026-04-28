// src/ui/core/panelDrag.ts - 面板拖拽功能（TypeScript迁移中）

export function makePanelDraggable(panel) {
  if (!panel) return;
  const header = panel.querySelector('.panel-header');
  if (!header) return;

  panel.style.transform = 'none';
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;

    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    panel.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    panel.classList.remove('dragging');
    restrictPanelToViewport(panel);
  });

  header.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    const touch = e.touches[0];
    const rect = panel.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    panel.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    let newLeft = touch.clientX - offsetX;
    let newTop = touch.clientY - offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    panel.classList.remove('dragging');
    restrictPanelToViewport(panel);
  });
}

export function restrictPanelToViewport(panel) {
  if (!panel) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rect = panel.getBoundingClientRect();
  const panelWidth = rect.width;
  const panelHeight = rect.height;

  let left = rect.left;
  let top = rect.top;

  if (left < 0) {
    left = 0;
  } else if (left + panelWidth > viewportWidth) {
    left = viewportWidth - panelWidth;
  }

  if (top < 0) {
    top = 0;
  } else if (top + panelHeight > viewportHeight) {
    top = viewportHeight - panelHeight;
  }

  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}
