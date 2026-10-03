import {
  AlertCircle, ArrowRight, Check, ChevronDown, ChevronRight,
  ExternalLink, FileSpreadsheet, Layers, Lock, Mail, Menu,
  PieChart, Plus, Repeat2, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import type { ComponentProps } from "react";

const icons = {
  "alert-circle": AlertCircle,
  "arrow-right": ArrowRight,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "external-link": ExternalLink,
  "file-spreadsheet": FileSpreadsheet,
  layers: Layers,
  lock: Lock,
  mail: Mail,
  menu: Menu,
  "pie-chart": PieChart,
  plus: Plus,
  repeat: Repeat2,
  sparkles: Sparkles,
  "trash-2": Trash2,
  upload: Upload,
  x: X,
};

export type IconName = keyof typeof icons;

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & Omit<ComponentProps<typeof AlertCircle>, "size">) {
  const Component = icons[name];
  return <Component size={size} aria-hidden="true" {...props} />;
}
