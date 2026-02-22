import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

const RISK_CONFIG = {
  ALTO: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: AlertTriangle,
    label: 'Alto'
  },
  MEDIO: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: AlertCircle,
    label: 'Medio'
  },
  BAJO: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
    label: 'Sin riesgo'
  }
};

export default function RiskBadge({ level, size = 'default' }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.BAJO;
  const Icon = config.icon;

  const sizeClasses = size === 'small' 
    ? 'px-2 py-0.5 text-xs gap-1' 
    : 'px-3 py-1.5 text-sm gap-1.5';

  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bg} ${config.border} ${config.text} ${sizeClasses}
      `}
    >
      <Icon className={iconSize} />
      {config.label}
    </motion.span>
  );
}