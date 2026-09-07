import { test, expect } from '@playwright/test';

test.describe('E2E Real-World Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads home page with MediQuiz AI header and upload section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /MediQuiz AI/i })).toBeVisible();
    await expect(page.getByText(/Tạo Bộ Trắc Nghiệm Mới/i)).toBeVisible();
    await expect(page.getByText(/Kéo thả file vào đây/i)).toBeVisible();
  });

  test('toggles dark and light mode', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /toggle theme/i });
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('shows validation error when attempting to generate without uploading files', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
    await expect(generateBtn).toBeDisabled();
  });
});
