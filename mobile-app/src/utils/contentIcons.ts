import {
  Users,
  Shield,
  Leaf,
  Car,
  Mail,
  Phone,
  Globe,
  MapPin,
  UserCheck,
  CreditCard,
  Star,
  FileText,
  Clock,
  MessageCircle,
  MessageSquare,
  BookOpen,
  Bug,
  Headphones,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react-native';

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  leaf: Leaf,
  car: Car,
  mail: Mail,
  phone: Phone,
  globe: Globe,
  map_pin: MapPin,
  map: MapPin,
  user_check: UserCheck,
  credit_card: CreditCard,
  star: Star,
  file_text: FileText,
  clock: Clock,
  message_circle: MessageCircle,
  message_square: MessageSquare,
  book_open: BookOpen,
  bug: Bug,
  headphones: Headphones,
  help_circle: HelpCircle,
};

export const resolveContentIcon = (iconName?: string, fallback?: LucideIcon): LucideIcon => {
  if (!iconName) return fallback || HelpCircle;
  const key = iconName.trim().toLowerCase();
  return ICON_MAP[key] || fallback || HelpCircle;
};

