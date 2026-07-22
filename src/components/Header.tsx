"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Stethoscope } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1.5rem 2rem',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--surface-glass)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Stethoscope size={32} color="var(--primary-color)" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary-color), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MediQuiz AI
        </h2>
      </div>
      
      <button 
        onClick={toggleTheme}
        className="btn-secondary"
        style={{ padding: '0.5rem', borderRadius: '50%' }}
        aria-label="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    </header>
  );
}
