---
type: web-page
title: Sunset Landing
runtime: vanilla
version: 1
editable: source-first
---
<template>
  <main data-node-id="page-root" class="page-shell">
    <section data-node-id="hero" class="hero-card">
      <p data-node-id="hero-kicker" class="hero-kicker">New Arrival</p>
      <h1 data-node-id="hero-title" class="hero-title">Build warm, visual landing pages inside your notes.</h1>
      <p data-node-id="hero-desc" class="hero-desc">
        This is the first minimal web-page document demo. It renders like a real page and pre-reserves node ids for future AI patching.
      </p>
      <div data-node-id="hero-actions" class="hero-actions">
        <button data-node-id="hero-primary" class="hero-primary">Launch Demo</button>
        <button data-node-id="hero-secondary" class="hero-secondary">Read Docs</button>
      </div>
    </section>
  </main>
</template>

<style>
  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at top left, rgba(255, 196, 111, 0.35), transparent 30%),
      radial-gradient(circle at bottom right, rgba(244, 114, 182, 0.22), transparent 30%),
      linear-gradient(135deg, #fff8ef 0%, #fff1f2 48%, #f8fafc 100%);
    padding: 32px;
    color: #1f2937;
    font-family: Georgia, "Times New Roman", serif;
  }

  .page-shell {
    width: min(920px, 100%);
  }

  .hero-card {
    padding: 48px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
  }

  .hero-kicker {
    margin: 0 0 12px;
    font-size: 12px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #b45309;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(38px, 7vw, 72px);
    line-height: 0.96;
    color: #111827;
  }

  .hero-desc {
    max-width: 58ch;
    margin: 18px 0 0;
    font-size: 18px;
    line-height: 1.7;
    color: #4b5563;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .hero-primary,
  .hero-secondary {
    border: none;
    border-radius: 999px;
    padding: 14px 22px;
    font-size: 15px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .hero-primary {
    background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
    color: white;
    box-shadow: 0 16px 32px rgba(239, 68, 68, 0.25);
  }

  .hero-secondary {
    background: rgba(255, 255, 255, 0.92);
    color: #111827;
    border: 1px solid rgba(148, 163, 184, 0.35);
  }

  .hero-primary:hover,
  .hero-secondary:hover {
    transform: translateY(-1px);
  }
</style>

<script>
  const primary = document.querySelector('[data-node-id="hero-primary"]');
  const secondary = document.querySelector('[data-node-id="hero-secondary"]');

  primary?.addEventListener('click', () => {
    primary.textContent = 'Demo Running';
  });

  secondary?.addEventListener('click', () => {
    secondary.textContent = 'Docs Opened';
  });
</script>
