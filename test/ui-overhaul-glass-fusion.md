# Plan: UI Overhaul - Glass & Apple Fusion Theme

## Goal
Implement a new "Glass & Apple Fusion" UI theme for `xiao-a-note`.
Key characteristics: Dark mode, Vibrancy/Blur background (Mica/Acrylic), Electric Blue/Purple accents, Inter font, Full-screen layout with increased "breathability" in the Sidebar.

## Tech Stack
-   **Electron**: Window configuration (`backgroundMaterial`, `transparent`).
-   **Tailwind CSS**: Theme extension for colors and spacing.
-   **CSS Variables**: Dynamic theming support.
-   **React**: Component updates.

## Architecture
1.  **Electron Main Process**: Enable transparency and vibrancy for the main window.
2.  **Theme Engine**: Create `themes/glass-fusion.css` containing the new color palette variables.
3.  **Tailwind Configuration**: Extend `tailwind.config.js` to map `colors.glass-...` to the CSS variables.
4.  **Component Refactoring**: Update `Sidebar` and `AppLayout` to use the new classes.

## Tasks

### Task 1: Enable Electron Vibrancy
**Files:**
- Modify: `electron/main.ts`

**Step 1: Update BrowserWindow Config**
Modify `createWindow` function to enable `transparent: true` and set `backgroundMaterial: 'mica'` (or 'acrylic' as fallback).
*Note: Since there is no automated test for visual window traits in Electron easily, we will verify by launching the app manually after this step.*

### Task 2: Create Glass Fusion Theme CSS
**Files:**
- Create: `themes/glass-fusion.css`
- Modify: `src/main.tsx` (or entry point) to allow importing/switching this theme.

**Step 1: Define CSS Variables**
Create `themes/glass-fusion.css` with:
- `--bg-glass`: `rgba(20, 20, 25, 0.7)` (Deep transparent black)
- `--bg-sidebar`: `rgba(30, 30, 35, 0.4)` (Lighter vibrancy)
- `--color-accent-start`: `#4f46e5` (Electric Indigo)
- `--color-accent-end`: `#a855f7` (Purple)
- `--font-sans`: `'Inter', system-ui, sans-serif`

### Task 3: Configure Tailwind
**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css` (Base styles)

**Step 1: Extend Tailwind Theme**
Add `colors.glass` and `fontFamily.sans` to `theme.extend`.

### Task 4: Refactor Sidebar Component
**Files:**
- Modify: `src/components/Sidebar.tsx` (Assuming path, will check real path)

**Step 1: Update Layout & Styling**
- Remove fixed solid backgrounds.
- Add `backdrop-blur` classes if needed (though Electron handles the main blur, element-level blur is nice).
- Increase padding for "Airy" feel.
- Implement the "Pill" shape selection indicator with Gradient background (`bg-gradient-to-r`).

### Task 5: Refactor App Layout & Editor
**Files:**
- Modify: `src/AppLayout.tsx` (or equivalent)
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Ensure Full Width**
- verify `flex` layout ensures Editor takes 100% remaining width.
- Remove any "Card" styling wrappers if they exist.
- Ensure Editor background is transparent (to let window vibrancy show through) or slightly opaque (`bg-black/50`) for readability.