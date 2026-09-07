import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';

describe('Tier 1: Header Component & Theme Switching', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  const renderHeader = () => {
    return render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    );
  };

  it('T1.5.1: renders the branding title "MediQuiz AI"', () => {
    renderHeader();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('MediQuiz AI');
  });

  it('T1.5.2: renders the theme toggle button with proper accessible label', () => {
    renderHeader();
    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('T1.5.3: toggles data-theme attribute on documentElement to dark when clicked', () => {
    renderHeader();
    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    
    // Initially light
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
    
    // Click toggle to dark
    fireEvent.click(toggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('T1.5.4: toggles theme back from dark to light on second click', () => {
    renderHeader();
    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    
    fireEvent.click(toggleBtn); // switch to dark
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(toggleBtn); // switch to light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('T1.5.5: persists selected theme in localStorage', () => {
    renderHeader();
    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });

    fireEvent.click(toggleBtn);
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(toggleBtn);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('T1.5.6: restores theme from localStorage on initial render', () => {
    localStorage.setItem('theme', 'dark');
    renderHeader();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
