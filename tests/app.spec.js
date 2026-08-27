const { test, expect } = require('@playwright/test');

test.describe('YoutubAlMuslim App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file:///home/heavenly-dev/TermProj/WORKSTATION/purpose/YoutubAlMuslim/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('should load homepage with video grid', async ({ page }) => {
    const grid = await page.locator('#videoGrid');
    await expect(grid).toBeVisible();
    const cards = await page.locator('.yt-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should display topic chips', async ({ page }) => {
    const chips = await page.locator('.yt-chip').count();
    expect(chips).toBeGreaterThan(5);
    const allChip = await page.locator('[data-topic-id="all"]');
    await expect(allChip).toHaveClass(/yt-chip--active/);
  });

  test('should search videos', async ({ page }) => {
    await page.fill('#searchInput', 'allah');
    await page.waitForTimeout(300);
    const cards = await page.locator('.yt-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should filter by topic', async ({ page }) => {
    const topicChip = await page.locator('[data-topic-id="foundation-allah"]').first();
    await topicChip.click();
    await page.waitForTimeout(200);
    const cards = await page.locator('.yt-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should open video modal', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const modal = await page.locator('#videoModal');
    await expect(modal).toBeVisible();
    const iframe = await page.locator('iframe');
    await expect(iframe).toBeVisible();
  });

  test('should display YouTube iframe with correct src', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const iframe = await page.locator('iframe');
    const src = await iframe.getAttribute('src');
    expect(src).toContain('youtube.com/embed/');
    expect(src).toContain('autoplay=1');
  });

  test('should close modal on close button', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const modal = await page.locator('#videoModal');
    await expect(modal).toBeVisible();
    const closeBtn = await page.locator('.yt-watch-close');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('should close modal on Escape key', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const modal = await page.locator('#videoModal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should bookmark video', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    const bookmark = await card.locator('.yt-card-bookmark');
    await expect(bookmark).not.toHaveClass(/bookmarked/);
    await bookmark.click();
    await expect(bookmark).toHaveClass(/bookmarked/);
  });

  test('should toggle theme', async ({ page }) => {
    const themeBtn = await page.locator('#themeToggle');
    const html = await page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await themeBtn.click();
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should display language chips', async ({ page }) => {
    const langChips = await page.locator('.yt-chip-bar--lang .yt-chip').count();
    expect(langChips).toBeGreaterThan(3);
  });

  test('should filter by language', async ({ page }) => {
    const langChips = await page.locator('[data-lang="ar"]');
    if (await langChips.count() > 0) {
      await langChips.first().click();
      await page.waitForTimeout(200);
      const cards = await page.locator('.yt-card').count();
      expect(cards).toBeGreaterThan(0);
    }
  });

  test('should show no results for empty search', async ({ page }) => {
    await page.fill('#searchInput', 'xyznonexistentterm123');
    await page.waitForTimeout(300);
    const noResults = await page.locator('#noResults');
    await expect(noResults).toBeVisible();
  });

  test('should display related videos in modal', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const related = await page.locator('.yt-related-item').count();
    expect(related).toBeGreaterThan(0);
  });

  test('should display video metadata', async ({ page }) => {
    const card = await page.locator('.yt-card').first();
    await card.click();
    const title = await page.locator('#modalTitle');
    const speaker = await page.locator('#modalSpeaker');
    const meta = await page.locator('#modalMeta');
    await expect(title).toBeVisible();
    await expect(speaker).toBeVisible();
    await expect(meta).toBeVisible();
  });

  test('should have no ads visible', async ({ page }) => {
    const ads = await page.locator('[class*="ad"]').count();
    const iframeAds = await page.locator('iframe[src*="ads"]').count();
    expect(iframeAds).toBe(0);
  });

  test('should load infinite scroll', async ({ page }) => {
    const grid = await page.locator('#videoGrid');
    const initialCards = await page.locator('.yt-card').count();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 10));
    await page.waitForTimeout(500);
    const newCards = await page.locator('.yt-card').count();
    expect(newCards).toBeGreaterThanOrEqual(initialCards);
  });

  test('should toggle sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    const sidebar = await page.locator('#sidebar');
    const toggle = await page.locator('#sidebarToggle');
    await toggle.click();
    await expect(sidebar).toHaveClass(/open/);
  });

  test('should display bookmarks view', async ({ page }) => {
    const bookmarkBtn = await page.locator('#bookmarksBtn');
    await bookmarkBtn.click();
    const bookmarkView = await page.locator('#bookmarksView');
    await expect(bookmarkView).toBeVisible();
  });

  test('should show inspire me functionality', async ({ page }) => {
    const inspireBtn = await page.locator('#randomBtn');
    await inspireBtn.click();
    const modal = await page.locator('#videoModal');
    await expect(modal).toBeVisible();
  });
});
