import React from 'react';
import {
  ForkKnife,
  Car,
  House,
  GameController,
  HeartStraight,
  Bag,
  GraduationCap,
  Money,
  Briefcase,
  TrendUp,
  Tag,
  ShoppingBag,
  Airplane,
  Coffee,
  GasPump,
  FilmSlate,
  Gift,
  Laptop,
  Phone,
  ShieldCheck,
  PiggyBank,
  CreditCard,
  Bank,
  Receipt,
  Coins,
  Wallet,
  Wine,
  BeerBottle,
  Hamburger,
  Pizza,
  Martini,
  Bicycle,
  Motorcycle,
  Bus,
  Train,
  Taxi,
  Drop,
  Wrench,
  Lightbulb,
  PawPrint,
  Plant,
  Flower,
  Baby,
  Armchair,
  Barbell,
  MusicNotes,
  Headphones,
  Television,
  Camera,
  Ticket,
  Sparkle,
  BookOpen,
  Palette,
  ShoppingCart,
  Storefront,
  TShirt,
  Sneaker,
  HandCoins,
  Vault,
  Scales,
  ChartLineUp,
  CurrencyDollar,
  type IconProps,
} from '@phosphor-icons/react';

export const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  ForkKnife,
  Car,
  House,
  GameController,
  HeartStraight,
  Bag,
  GraduationCap,
  Money,
  Briefcase,
  TrendUp,
  Tag,
  ShoppingBag,
  Airplane,
  Coffee,
  GasPump,
  FilmSlate,
  Gift,
  Laptop,
  Phone,
  ShieldCheck,
  PiggyBank,
  CreditCard,
  Bank,
  Receipt,
  Coins,
  Wallet,
  Wine,
  BeerBottle,
  Hamburger,
  Pizza,
  Martini,
  Bicycle,
  Motorcycle,
  Bus,
  Train,
  Taxi,
  Drop,
  Wrench,
  Lightbulb,
  PawPrint,
  Plant,
  Flower,
  Baby,
  Armchair,
  Barbell,
  MusicNotes,
  Headphones,
  Television,
  Camera,
  Ticket,
  Sparkle,
  BookOpen,
  Palette,
  ShoppingCart,
  Storefront,
  TShirt,
  Sneaker,
  HandCoins,
  Vault,
  Scales,
  ChartLineUp,
  CurrencyDollar,
};

// Normalized case-insensitive lookup map
const NORMALIZED_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {};
Object.entries(ICON_MAP).forEach(([key, comp]) => {
  NORMALIZED_ICON_MAP[key.toLowerCase()] = comp;
  NORMALIZED_ICON_MAP[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = comp;
});

// Semantic category name aliases (matching User's category names)
const CATEGORY_NAME_ALIASES: Record<string, React.ComponentType<IconProps>> = {
  'comida chatarra': Hamburger,
  'chatarra': Hamburger,
  'hamburguesa': Hamburger,
  'trago': Martini,
  'tragos': Martini,
  'cerveza': BeerBottle,
  'vino': Wine,
  'bienestar': HeartStraight,
  'salud': HeartStraight,
  'compras': Bag,
  'otros gastos': Coins,
  'otros': Coins,
  'bebidas': Coffee,
  'café': Coffee,
  'cafe': Coffee,
  'digital a efectivo': Money,
  'efectivo a digital': Wallet,
  'reposición de ahorro': PiggyBank,
  'reposicion de ahorro': PiggyBank,
  'aporte a ahorro': PiggyBank,
  'ahorro': PiggyBank,
  'alimentación': ForkKnife,
  'alimentacion': ForkKnife,
  'comida': ForkKnife,
  'transporte': Car,
  'pasajes': Car,
  'entretenimiento': GameController,
  'juegos': GameController,
  'hogar': House,
  'casa': House,
  'educación': GraduationCap,
  'educacion': GraduationCap,
  'salario': TrendUp,
  'sueldo': Briefcase,
  'servicios': Lightbulb,
  'regalos': Gift,
  'viajes': Airplane,
  'ropa': TShirt,
  'tecnología': Laptop,
  'tecnologia': Laptop,
  'efectivo': Money,
  'billetera': Wallet,
  'tarjeta': CreditCard,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const getCategoryIcon = (iconNameOrCategory?: string): React.ComponentType<IconProps> => {
  if (!iconNameOrCategory) return Tag;

  // 1. Direct key in ICON_MAP
  if (ICON_MAP[iconNameOrCategory]) {
    return ICON_MAP[iconNameOrCategory];
  }

  // 2. Normalized lowercase icon lookup
  const cleanKey = iconNameOrCategory.toLowerCase().trim();
  if (NORMALIZED_ICON_MAP[cleanKey]) {
    return NORMALIZED_ICON_MAP[cleanKey];
  }
  const strippedKey = cleanKey.replace(/[^a-z0-9]/g, '');
  if (NORMALIZED_ICON_MAP[strippedKey]) {
    return NORMALIZED_ICON_MAP[strippedKey];
  }

  // 3. Category name alias lookup
  if (CATEGORY_NAME_ALIASES[cleanKey]) {
    return CATEGORY_NAME_ALIASES[cleanKey];
  }

  return Tag;
};

