
import { useTranslation } from 'react-i18next';
import { 
  ClockIcon,
  UserIcon,
  HeartIcon,
  HashtagIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  CalendarDaysIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Badge } from '../ui/badge';
import type { Appointment, Pet, User } from '../../types';

interface GroomerAppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
  className?: string;
  showViewDetails?: boolean;
  currentTime?: Date;
}

const GroomerAppointmentCard = ({ 
  appointment, 
  onClick, 
  className = '',
  showViewDetails = true,
  currentTime = new Date()
}: GroomerAppointmentCardProps) => {
  const { t, i18n } = useTranslation('booking');
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';

  const getVisualStatus = (apt: Appointment) => {
    const now = currentTime;
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    
    if (['cancelled', 'completed', 'no_show'].includes(apt.status)) {
      return apt.status;
    }
    
    if (now >= start && now <= end && !['cancelled', 'no_show'].includes(apt.status)) {
      return 'in_progress';
    }
    
    if (now > end && apt.status === 'confirmed') {
      return 'completed';
    }
    
    return apt.status;
  };

  const getAppointmentStatusDisplay = (apt: Appointment) => {
    const visualStatus = getVisualStatus(apt);
    
    switch(visualStatus) {
      case 'confirmed':
        return { 
          label: t('status.confirmed'), 
          bgColor: 'bg-gradient-to-r from-amber-500 to-yellow-500',
          textColor: 'text-white',
          icon: CheckCircleIcon 
        };
      case 'in_progress':
        return { 
          label: t('status.inProgress'), 
          bgColor: 'bg-amber-500', 
          textColor: 'text-white',
          icon: PlayIcon 
        };
      case 'completed':
        return { 
          label: t('status.completed'), 
          bgColor: 'bg-green-500', 
          textColor: 'text-white',
          icon: CheckCircleIcon 
        };
      case 'cancelled':
        return { 
          label: t('status.cancelled'), 
          bgColor: 'bg-amber-700', 
          textColor: 'text-white',
          icon: XCircleIcon 
        };
      case 'no_show':
        return { 
          label: t('status.noShow'), 
          bgColor: 'bg-red-800', 
          textColor: 'text-white',
          icon: XCircleIcon 
        };
      default:
        return { 
          label: t('status.confirmed'), 
          bgColor: 'bg-gradient-to-r from-amber-500 to-yellow-500',
          textColor: 'text-white',
          icon: CalendarDaysIcon 
        };
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPetName = (petId: string | Pet | null) => {
    if (typeof petId === 'object' && petId !== null) return petId.name || t('unknownPet');
    return t('unknownPet');
  };

  const getPetBreedSpecies = (petId: string | Pet | null) => {
    if (typeof petId === 'object' && petId !== null) {
      const breed = petId.breed || t('unknownBreed');
      const species = petId.species || t('unknownSpecies');
      return { breed, species };
    }
    return { breed: t('unknownBreed'), species: t('unknownSpecies') };
  };

  const getOwnerName = (ownerId: string | User | null) => {
    if (typeof ownerId === 'object' && ownerId !== null) {
      return ownerId.name || t('unknownOwner');
    }
    return t('unknownOwner');
  };

  const statusDisplay = getAppointmentStatusDisplay(appointment);
  const StatusIcon = statusDisplay.icon;

  const { breed, species } = getPetBreedSpecies(appointment.petId);
  const formattedBreed = breed.charAt(0).toUpperCase() + breed.slice(1);
  const formattedSpecies = species.charAt(0).toUpperCase() + species.slice(1);
  const serviceLabel = t(`serviceTypes.${appointment.serviceType}`);
  const titleLine = t('groomerCard.titleLine', {
    breed: formattedBreed,
    species: formattedSpecies,
    service: serviceLabel,
  });

  return (
    <div 
      className={`cursor-pointer rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] p-4 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40 ${className}`}
      onClick={() => onClick(appointment)}
    >
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-[#3F2A1E]">
              {titleLine}
            </h3>
            <Badge className={`${statusDisplay.bgColor} ${statusDisplay.textColor} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusDisplay.label}
            </Badge>
            {appointment.appointmentSource && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                {t(`appointmentSource.${appointment.appointmentSource}`)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 text-amber-900/80 sm:flex-row sm:items-center sm:gap-6">
            <span className="flex items-center gap-1 font-medium">
              <ClockIcon className="h-4 w-4 text-amber-700" />
              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <HeartIcon className="h-4 w-4 text-amber-700" />
              {t('groomerCard.pet')}: {getPetName(appointment.petId)}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <UserIcon className="h-4 w-4 text-amber-700" />
              {t('groomerCard.owner')}: {getOwnerName(appointment.ownerId)}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <HashtagIcon className="h-4 w-4 text-amber-700" />
              {t('groomerCard.bookingRef')}: {appointment._id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>
        {showViewDetails && (
          <div className="flex items-center gap-1 text-amber-900/80">
            <EyeIcon className="h-5 w-5 text-amber-700" />
            {t('groomerCard.viewDetails')}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroomerAppointmentCard;
