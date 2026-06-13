export const STATUS_META = {
  healthy: {
    label: 'Healthy',
    text: 'text-[#22c55e]',
    bg: 'bg-[rgba(22,163,74,0.15)]',
    border: 'border-[rgba(34,197,94,0.35)]',
    dot: 'bg-[#22c55e]',
    glow: 'shadow-[0_0_24px_rgba(34,197,94,0.3)]',
    line: '#22c55e',
  },
  warning: {
    label: 'Warning',
    text: 'text-[#D97706]',
    bg: 'bg-[rgba(217,119,6,0.12)]',
    border: 'border-[rgba(217,119,6,0.35)]',
    dot: 'bg-[#D97706]',
    glow: 'shadow-[0_0_24px_rgba(217,119,6,0.28)]',
    line: '#D97706',
  },
  critical: {
    label: 'Critical',
    text: 'text-[#DC2626]',
    bg: 'bg-[rgba(220,38,38,0.12)]',
    border: 'border-[rgba(220,38,38,0.35)]',
    dot: 'bg-[#DC2626]',
    glow: 'shadow-[0_0_28px_rgba(220,38,38,0.32)]',
    line: '#DC2626',
  },
  info: {
    label: 'Info',
    text: 'text-[#7A9E97]',
    bg: 'bg-[rgba(122,158,151,0.12)]',
    border: 'border-[rgba(122,158,151,0.35)]',
    dot: 'bg-[#7A9E97]',
    glow: 'shadow-[0_0_24px_rgba(122,158,151,0.22)]',
    line: '#7A9E97',
  },
  active: {
    label: 'Active',
    text: 'text-[#A8C465]',
    bg: 'bg-[rgba(168,196,101,0.12)]',
    border: 'border-[rgba(168,196,101,0.35)]',
    dot: 'bg-[#A8C465]',
    glow: 'shadow-[0_0_24px_rgba(168,196,101,0.28)]',
    line: '#A8C465',
  },
  alert: {
    label: 'Alert',
    text: 'text-[#D97706]',
    bg: 'bg-[rgba(217,119,6,0.12)]',
    border: 'border-[rgba(217,119,6,0.35)]',
    dot: 'bg-[#D97706]',
    glow: 'shadow-[0_0_24px_rgba(217,119,6,0.28)]',
    line: '#D97706',
  },
}

export function getStatusMeta(status = 'info') {
  return STATUS_META[status] ?? STATUS_META.info
}
