export const STATUS_META = {
  healthy: {
    label: 'Healthy',
    text: 'text-[#00ff88]',
    bg: 'bg-[#00ff88]/10',
    border: 'border-[#00ff88]/30',
    dot: 'bg-[#00ff88]',
    glow: 'shadow-[0_0_24px_rgba(0,255,136,0.28)]',
    line: '#00ff88',
  },
  warning: {
    label: 'Warning',
    text: 'text-[#ffaa00]',
    bg: 'bg-[#ffaa00]/10',
    border: 'border-[#ffaa00]/30',
    dot: 'bg-[#ffaa00]',
    glow: 'shadow-[0_0_24px_rgba(255,170,0,0.28)]',
    line: '#ffaa00',
  },
  critical: {
    label: 'Critical',
    text: 'text-[#ff4444]',
    bg: 'bg-[#ff4444]/10',
    border: 'border-[#ff4444]/30',
    dot: 'bg-[#ff4444]',
    glow: 'shadow-[0_0_28px_rgba(255,68,68,0.32)]',
    line: '#ff4444',
  },
  info: {
    label: 'Info',
    text: 'text-[#4488ff]',
    bg: 'bg-[#4488ff]/10',
    border: 'border-[#4488ff]/30',
    dot: 'bg-[#4488ff]',
    glow: 'shadow-[0_0_24px_rgba(68,136,255,0.22)]',
    line: '#4488ff',
  },
  active: {
    label: 'Active',
    text: 'text-[#00ff88]',
    bg: 'bg-[#00ff88]/10',
    border: 'border-[#00ff88]/30',
    dot: 'bg-[#00ff88]',
    glow: 'shadow-[0_0_24px_rgba(0,255,136,0.28)]',
    line: '#00ff88',
  },
  alert: {
    label: 'Alert',
    text: 'text-[#ffaa00]',
    bg: 'bg-[#ffaa00]/10',
    border: 'border-[#ffaa00]/30',
    dot: 'bg-[#ffaa00]',
    glow: 'shadow-[0_0_24px_rgba(255,170,0,0.28)]',
    line: '#ffaa00',
  },
}

export function getStatusMeta(status = 'info') {
  return STATUS_META[status] ?? STATUS_META.info
}
