export interface User {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    role: 'owner' | 'groomer' | 'admin';
    /** Email verification status (API-computed; legacy accounts may show verified). */
    isVerified?: boolean;
    preferredLocale?: 'zh' | 'en';
    createdAt?: string;
    updatedAt?: string;
  }
  
  export type PetSize = 'small' | 'medium' | 'large' | 'xlarge';

  export interface Pet {
    _id: string;
    name: string;
    species: 'dog' | 'cat';
    breed: string;
    age: number;
  imageUrl?: string;
    notes?: string;
  notesForGroomer?: string;
    /** Required for new pets; optional on legacy records */
    size?: PetSize;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  }
  // union types are a design choice for MongoDB/Mongoose patterns
  // when fetch from API, get petId: string
  // when populated/joined, get petId: Pet object
  export interface Appointment {
    _id: string;
    /** May be null for walk-in / manual bookings without a pet */
    petId: string | Pet | null;
    /** May be null for walk-in / manual bookings without an owner */
    ownerId: string | User | null;
      groomerId: string | User;
    serviceType: 'basic' | 'full' | 'boarding';
    duration: number;
    startTime: string;
    endTime: string;
    checkInDate?: string;
    checkOutDate?: string;
    petSize?: PetSize;
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    
    // groomer workflow fields
    groomerAcknowledged?: boolean;
    appointmentSource?:
      | 'owner_booking'
      | 'groomer_created'
      | 'phone_booking'
      | 'online';
    
    // pricing fields
    pricingStatus?: 'pending' | 'estimated' | 'confirmed';
    totalCost?: number | null;
    priceHistory?: Array<{
      amount: number;
      setAt: string;
      reason: string;
      setBy?: string;
    }>;
    
    // service tracking
    actualStartTime?: string;
    actualEndTime?: string;
    actualDuration?: number;
    
    // additional fields
    specialInstructions?: string;
    groomerNotes?: string;
    photos?: Array<{
      url: string;
      uploadedAt: string;
      description?: string;
    }>;
    
    // cancellation tracking
    cancellationReason?: string;
    cancellationFee?: number;
    noShowFee?: number;
    
    // payment tracking
    paymentStatus?: 'pending' | 'paid' | 'refunded';
    
    // communication tracking
    reminderSent?: boolean;
    confirmationSent?: boolean;
    
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Groomer {
    _id: string;
    name: string;
    email: string;
    specialties?: string[];
  }

  // add missing auth-related interfaces
  export interface RegisterData {
    name: string;
    email: string;
    password: string;
    /** Malaysia mobile: digits starting with 01, 10–11 digits (normalized before send) */
    phone: string;
  role: 'owner' | 'groomer' | 'admin';
  /** Sent to API for bilingual verification email */
  locale?: 'zh' | 'en';
  }

export interface CreateGroomerPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AdminUserListItem extends User {
  role: 'owner' | 'groomer' | 'admin';
  createdAt: string;
  isVerified: boolean;
  preferredLocale?: 'zh' | 'en';
  petCount?: number;
}

export interface Promotion {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

  export interface LoginResponse {
    user: User;
    token: string;
    accessToken?: string;
    message?: string;
    /** Present after register: whether the verification email was sent */
    verificationEmailSent?: boolean;
    /** Bilingual notice when verification email was skipped or failed */
    verificationEmailNotice?: string | null;
  }

  export interface UpdateProfilePayload {
    name?: string;
    phone?: string;
    preferredLocale?: "zh" | "en";
  }

  export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
  }

  export interface ApiError {
    error: string;
    message?: string;
    code?: string;
  }

  /** Groomer manual booking API body */
  export type GroomerBookingSource = 'online' | 'phone' | 'groomer_created';

  export interface GroomerCreateBookingPayload {
    /** Optional: walk-in booking may not have a pet selected yet */
    petId?: string | null;
    /** Grooming: ISO slot start */
    startTime?: string;
    /** Boarding: YYYY-MM-DD */
    checkInDate?: string;
    serviceType: 'basic' | 'full' | 'boarding';
    appointmentSource: GroomerBookingSource;
    specialInstructions?: string;
    petSize?: PetSize;
  }

  /** Pet row from GET /pets/staff-search (ownerId may be populated) */
  export type PetStaffSearchResult = Omit<Pet, 'ownerId'> & {
    ownerId: string | Pick<User, '_id' | 'name' | 'email'>;
  };

  // service data interfaces
  export interface CreatePetData {
    name: string;
    species: 'dog' | 'cat';
    breed: string;
    age: number;
    size: PetSize;
    notes?: string;
  notesForGroomer?: string;
  }
  // UpdatePetData declares no new members {}, essentially a functionally equivalent partial of CreatePetData
  // Partial<T> util type simply makes all props of the original optional
  // Indicates this type is for updating pet data, can always add more update-specific props later if needed
  // Makes sense bc when updating, we only change some fields/props, not all of them
  // Common design pattern for creating semantically meaningful type aliases in TS
  // Now this allows for flexible partial updates while maintaining type safety on the fields that are provided
  export type UpdatePetData = Partial<CreatePetData>;

  export interface CreateAppointmentData {
    petId: string;
    /** Optional: if omitted, backend will auto-assign a groomer */
    groomerId?: string | null;
    serviceType: 'basic' | 'full' | 'boarding';
    /** Grooming: ISO start from slot */
    startTime?: string;
    /** Boarding: YYYY-MM-DD */
    checkInDate?: string;
  }

  export type UpdateAppointmentData = Partial<CreateAppointmentData>;

  export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
  }

  export type AppointmentStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

  // add interface for quick actions (titles from i18n via id)
  export interface QuickAction {
    id: 'book' | 'managePets' | 'manageAppointments';
    icon: React.ComponentType<{ className?: string }>;
    link?: string;
    action?: () => void;
    color: string;
  }

  // Workflow action interfaces
  export interface SetPricingData {
    totalCost: number;
    pricingStatus?: 'pending' | 'estimated' | 'confirmed';
    reason: string;
  }

  export interface CompleteServiceData {
    groomerNotes?: string;
    photos?: Array<{
      url: string;
      description?: string;
    }>;
  }

  // Time block interface for groomer schedule management
  export interface TimeBlock {
    _id: string;
    groomerId: string;
    startTime: string;
    endTime: string;
    blockType: 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance';
    reason?: string;
    isRecurring: boolean;
    recurringPattern?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      daysOfWeek: number[];
      endDate?: string;
    };
    createdAt: string;
    updatedAt: string;
  }
