'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '0.625rem 1.5rem',
        background: 'rgba(232,184,0,0.12)',
        border: '1px solid rgba(232,184,0,0.25)',
        borderRadius: '0.75rem',
        color: '#f5c842',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,184,0,0.2)';
        (e.currentTarget as HTMLButtonElement).style.color = '#fcd97a';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,184,0,0.12)';
        (e.currentTarget as HTMLButtonElement).style.color = '#f5c842';
      }}
    >
      🖨 Print / Save as PDF
    </button>
  );
}
