import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkle,
  User,
  SignOut,
  Check,
  FloppyDisk,
  ShieldCheck,
  Code,
  Lock,
  UserCircle,
  Robot,
  Smiley,
  Crown,
  Lightning,
  Fire,
  Heart,
  GlobeHemisphereWest,
  Buildings,
  Camera,
  UploadSimple,
  Trash,
  CaretDown,
  CaretUp,
  Phone,
  Database,
  DeviceMobile,
  type IconProps,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { DownloadAppModal } from '../common/DownloadAppModal';

const AVATAR_OPTIONS: { id: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { id: 'User', label: 'Persona', Icon: User },
  { id: 'UserCircle', label: 'Círculo', Icon: UserCircle },
  { id: 'Crown', label: 'Corona', Icon: Crown },
  { id: 'Sparkle', label: 'Destello', Icon: Sparkle },
  { id: 'Lightning', label: 'Rayo', Icon: Lightning },
  { id: 'Fire', label: 'Fuego', Icon: Fire },
  { id: 'Heart', label: 'Corazón', Icon: Heart },
  { id: 'ShieldCheck', label: 'Escudo', Icon: ShieldCheck },
  { id: 'Robot', label: 'Robot', Icon: Robot },
  { id: 'Smiley', label: 'Sonrisa', Icon: Smiley },
];

const COUNTRIES_CITIES: Record<string, string[]> = {
  Perú: [
    'Amazonas',
    'Áncash',
    'Apurímac',
    'Arequipa',
    'Ayacucho',
    'Cajamarca',
    'Callao',
    'Cusco',
    'Huancavelica',
    'Huánuco',
    'Ica',
    'Junín',
    'La Libertad',
    'Lambayeque',
    'Lima',
    'Loreto',
    'Madre de Dios',
    'Moquegua',
    'Pasco',
    'Piura',
    'Puno',
    'San Martín',
    'Tacna',
    'Tumbes',
    'Ucayali',
  ],
  México: [
    'Aguascalientes',
    'Baja California',
    'Ciudad de México',
    'Guadalajara',
    'Monterrey',
    'Puebla',
    'Querétaro',
    'Cancún',
  ],
  Colombia: [
    'Antioquia (Medellín)',
    'Atlántico (Barranquilla)',
    'Bogotá D.C.',
    'Bolívar (Cartagena)',
    'Cali (Valle del Cauca)',
    'Santander (Bucaramanga)',
  ],
  Argentina: [
    'Buenos Aires',
    'Córdoba',
    'Mendoza',
    'Rosario',
    'Santa Fe',
    'Tucumán',
  ],
  Chile: [
    'Antofagasta',
    'Concepción',
    'La Serena',
    'Santiago (Metropolitana)',
    'Valparaíso',
  ],
  España: [
    'Barcelona',
    'Bilbao',
    'Madrid',
    'Málaga',
    'Sevilla',
    'Valencia',
  ],
  'Estados Unidos': [
    'California (Los Angeles)',
    'Florida (Miami)',
    'Illinois (Chicago)',
    'New York',
    'Texas (Houston)',
  ],
  Otro: ['Ciudad Principal', 'Otra Localidad'],
};

interface SettingsViewProps {
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isAdmin, onNavigateAdmin }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  // Estados completos de perfil de usuario
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [age, setAge] = useState<number | string>(profile?.age || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [country, setCountry] = useState(profile?.country || 'Perú');
  const [city, setCity] = useState(profile?.city || 'Lima');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || 'User');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const countryRef = useRef<HTMLDivElement | null>(null);
  const cityRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setIsCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación estricta de tipo MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert('Formato de imagen no permitido. Solo se aceptan archivos PNG, JPEG y WebP.');
      e.target.value = '';
      return;
    }

    // Límite estricto de tamaño a 5 MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('La foto debe pesar menos de 5 MB por motivos de seguridad y rendimiento.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Recorte centrado a proporción 1:1 y neutralización de metadatos/EXIF maliciosos
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, size, size);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : ''));
      setLastName(profile.last_name || (profile.full_name ? profile.full_name.split(' ').slice(1).join(' ') : ''));
      setNickname(profile.nickname || '');
      setAge(profile.age || '');
      setOccupation(profile.occupation || '');
      setPhoneNumber(profile.phone_number || '');
      setCountry(profile.country || 'Perú');
      setCity(profile.city || 'Lima');
      setAvatarUrl(profile.avatar_url || 'User');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim() || nickname.trim() || 'Usuario';
      
      await updateProfile({
        fullName: computedFullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        phoneNumber: phoneNumber.trim(),
        age: age ? Number(age) : undefined,
        occupation: occupation.trim(),
        country,
        city: city.trim(),
        avatarUrl,
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const availableCities = COUNTRIES_CITIES[country] || COUNTRIES_CITIES['Perú'];
  const filteredCities = availableCities.filter((ct) =>
    ct.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-28 select-none">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
            PREFERENCIAS DE CUENTA
          </span>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Ajustes & Personalización
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] truncate max-w-[200px]">
              {user?.email || 'Cuenta Activa'}
            </span>
          </div>
        </div>
      </div>

      {/* TARJETA 1: PERFIL DE USUARIO COMPLETO (relative z-30 para evitar que TARJETA 2 tape los dropdowns) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-30 glass-panel rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/50 border border-slate-200/80 dark:border-white/10 space-y-7"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-black/10 dark:shadow-black/30">
              {React.createElement(
                AVATAR_OPTIONS.find((a) => a.id === avatarUrl)?.Icon || User,
                { size: 26, weight: 'bold' }
              )}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
                IDENTIDAD Y DATOS
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Personalización Integral de Cuenta
              </h3>
            </div>
          </div>

          {profileSuccess && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 shadow-sm"
            >
              <Check size={14} weight="bold" /> ¡Cambios Guardados!
            </motion.span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Subida de Foto de Perfil & Avatar */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Foto de Perfil & Avatar
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sube una foto personalizada (JPG, PNG, WebP máx. 5MB) o selecciona un avatar predeterminado.
                </p>
              </div>

              {/* Input oculto para seleccionar archivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Previsualización del Avatar */}
              <div className="relative group shrink-0">
                <div className="w-22 h-22 rounded-full overflow-hidden border-4 border-white dark:border-[#1c1d28] shadow-xl bg-zinc-950 dark:bg-zinc-800 flex items-center justify-center text-white ring-2 ring-slate-200 dark:ring-white/10">
                  {avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('http') ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (() => {
                      const IconComp = AVATAR_OPTIONS.find((a) => a.id === avatarUrl)?.Icon || User;
                      return <IconComp size={42} weight="bold" className="text-white drop-shadow-sm" />;
                    })()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar foto de perfil"
                  className="absolute bottom-0 right-0 p-2.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera size={15} weight="bold" />
                </button>
              </div>

              {/* Acciones de Foto & Vista Previa Compacta */}
              <div className="space-y-3 w-full sm:w-auto">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-unified px-4 py-2.5 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-black/10 dark:shadow-black/30 cursor-pointer"
                  >
                    <UploadSimple size={16} weight="bold" />
                    <span>Subir Foto de Perfil</span>
                  </button>

                  {(avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('http')) && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('User')}
                      className="px-3.5 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash size={15} weight="bold" />
                      <span>Quitar foto</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Se mostrará como: <strong className="text-slate-800 dark:text-white">{nickname ? `@${nickname}` : firstName || 'Usuario'}</strong>
                </div>
              </div>
            </div>

            {/* Alternativa: Selector de Iconos Predeterminados */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">
                O ELIGE UN ICONO DE PERFIL PREDETERMINADO:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_OPTIONS.map((a) => {
                  const { Icon } = a;
                  const isSel = avatarUrl === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAvatarUrl(a.id)}
                      title={a.label}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                        isSel
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-105 ring-2 ring-zinc-950 dark:ring-white ring-offset-2 dark:ring-offset-[#13141c]'
                          : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <Icon size={19} weight={isSel ? 'bold' : 'regular'} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Formulario de Campos Agrupados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombres */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Nombres
              </label>
              <input
                type="text"
                placeholder="Ej. Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
              />
            </div>

            {/* Apellidos */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Apellidos
              </label>
              <input
                type="text"
                placeholder="Ej. Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
              />
            </div>

            {/* Nombre de Usuario / Nickname */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Nombre de Usuario (Nickname)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  placeholder="juanperez"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all font-mono"
                />
              </div>
            </div>

            {/* Correo (Solo Lectura) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Lock size={12} weight="bold" /> Correo Electrónico
              </label>
              <input
                type="email"
                value={user?.email || 'usuario@ejemplo.com'}
                disabled
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.02] text-xs font-mono text-slate-500 cursor-not-allowed select-none"
              />
            </div>

            {/* Edad */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Edad (Años)
              </label>
              <input
                type="number"
                placeholder="Ej. 25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={1}
                max={120}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all font-mono"
              />
            </div>

            {/* Profesión / Ocupación */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Profesión / Ocupación
              </label>
              <input
                type="text"
                placeholder="Ej. Desarrollador / Contador"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                maxLength={50}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
              />
            </div>

            {/* Número Telefónico */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Phone size={13} weight="bold" /> Número Telefónico
              </label>
              <input
                type="tel"
                placeholder="+51 987 654 321"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={25}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all font-mono"
              />
            </div>

            {/* País (Custom Styled Dropdown con z-50) */}
            <div ref={countryRef} className="space-y-1 relative">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <GlobeHemisphereWest size={13} weight="bold" /> País de Residencia
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCountryOpen((prev) => !prev);
                  setIsCityOpen(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GlobeHemisphereWest size={15} className="text-zinc-950 dark:text-white" />
                  <span>{country}</span>
                </div>
                {isCountryOpen ? (
                  <CaretUp size={14} weight="bold" className="text-slate-400" />
                ) : (
                  <CaretDown size={14} weight="bold" className="text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {isCountryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full inset-x-0 mt-1.5 z-50 bg-white/95 dark:bg-[#151622]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.12] rounded-2xl shadow-2xl p-1.5 max-h-56 overflow-y-auto space-y-1"
                  >
                    {Object.keys(COUNTRIES_CITIES).map((c) => {
                      const isSelected = c === country;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCountry(c);
                            const cities = COUNTRIES_CITIES[c];
                            if (cities && cities.length > 0) {
                              setCity(cities[0]);
                            }
                            setIsCountryOpen(false);
                            setCitySearch('');
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left cursor-pointer ${
                            isSelected
                              ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span>{c}</span>
                          {isSelected && <Check size={14} weight="bold" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Ciudad / Departamento */}
            <div ref={cityRef} className="space-y-1 relative">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Buildings size={13} weight="bold" /> {country === 'Perú' ? 'Departamento / Región' : 'Ciudad / Localidad'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCityOpen((prev) => !prev);
                  setIsCountryOpen(false);
                  setCitySearch('');
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Buildings size={15} className="text-zinc-950 dark:text-white shrink-0" />
                  <span className="truncate">{city || (country === 'Perú' ? 'Selecciona departamento' : 'Selecciona ciudad')}</span>
                </div>
                {isCityOpen ? (
                  <CaretUp size={14} weight="bold" className="text-slate-400 shrink-0" />
                ) : (
                  <CaretDown size={14} weight="bold" className="text-slate-400 shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {isCityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full inset-x-0 mt-1.5 z-50 bg-white/95 dark:bg-[#151622]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.12] rounded-2xl shadow-2xl p-2 max-h-64 overflow-hidden flex flex-col space-y-1.5"
                  >
                    {/* Campo de búsqueda rápida */}
                    <input
                      type="text"
                      placeholder={`Buscar ${country === 'Perú' ? 'departamento...' : 'ciudad...'}`}
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.06] text-xs font-bold text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                    />

                    <div className="overflow-y-auto max-h-48 space-y-1 pr-1">
                      {filteredCities.map((ct) => {
                        const isSelected = ct.toLowerCase() === city.toLowerCase();
                        return (
                          <button
                            key={ct}
                            type="button"
                            onClick={() => {
                              setCity(ct);
                              setIsCityOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left cursor-pointer ${
                              isSelected
                                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <span>{ct}</span>
                            {isSelected && <Check size={14} weight="bold" />}
                          </button>
                        );
                      })}

                      {/* Opción para escribir ciudad personalizada si no está en la lista */}
                      {citySearch.trim() && !availableCities.some((c) => c.toLowerCase() === citySearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCity(citySearch.trim());
                            setIsCityOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 text-left cursor-pointer"
                        >
                          <span>Usar "{citySearch.trim()}"</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="btn-unified py-3 px-6 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-50 cursor-pointer"
            >
              <FloppyDisk size={16} weight="bold" />
              {isSavingProfile ? 'Guardando Perfil...' : 'Guardar Cambios de Perfil'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* TARJETA 2: DESCARGAR E INSTALAR APP */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="relative z-10 glass-panel rounded-3xl p-6 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-md">
            <DeviceMobile size={26} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Descargar e Instalar Aplicación Móvil
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PWA / Android / iOS
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instala la aplicación directamente en la pantalla de inicio de tu smartphone o descarga el paquete APK.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDownloadModalOpen(true)}
          className="btn-unified py-2.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-black transition-all flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
        >
          <DeviceMobile size={16} weight="bold" />
          <span>Descargar App</span>
        </button>
      </motion.div>

      {/* TARJETA 3: ADMINISTRACIÓN DE BASE DE DATOS (SOLO ADMINISTRADOR) */}
      {isAdmin && onNavigateAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.2 }}
          className="relative z-10 glass-panel rounded-3xl p-6 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
              <Database size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                Panel de Administración de Base de Datos
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white border border-slate-200 dark:border-zinc-700">
                  Supabase Directo
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gestiona, visualiza y elimina usuarios, billeteras/tarjetas y movimientos en vivo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateAdmin}
            className="btn-unified py-2.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-black transition-all flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
          >
            <Database size={16} weight="bold" />
            <span>Abrir Panel BD</span>
          </button>
        </motion.div>
      )}

      {/* TARJETA 4: SESIÓN ACTIVA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.2 }}
        className="relative z-10 glass-panel rounded-3xl p-6 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
            <Code size={22} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Sesión Activa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {user?.email || 'usuario@ejemplo.com'}
            </p>
          </div>
        </div>

        {showSignOutConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => signOut()}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/30 cursor-pointer"
            >
              Confirmar Salida
            </button>
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/05 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black transition-all flex items-center gap-2 border border-rose-200 dark:border-rose-500/20 cursor-pointer"
          >
            <SignOut size={16} weight="bold" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </motion.div>

      {/* Modal para Descargar e Instalar App */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
};
