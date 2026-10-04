// Database Service for Doctor Appointment System
// Uses localStorage to persist data locally

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  location: string;
  phone: string;
  email: string;
  availability: string;
  experience: number;
  image: string;
  languages: string[];
  workingHours: {
    days: string;
    start: string;
    end: string;
  };
  slots: TimeSlot[];
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  duration: number;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  status: "confirmed" | "completed" | "cancelled";
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  notes: string;
  createdAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Database Keys
const DOCTORS_KEY = "pocketdoc_doctors";
const APPOINTMENTS_KEY = "pocketdoc_appointments";
const SPECIALTIES_KEY = "pocketdoc_specialties";
const DB_VERSION_KEY = "pocketdoc_db_version";

// Default data
const DEFAULT_SPECIALTIES: Specialty[] = [
  {
    id: "spec1",
    name: "Médecin Généraliste",
    description: "Consultations générales et suivi médical",
    icon: "🏥",
  },
  {
    id: "spec2",
    name: "Cardiologue",
    description: "Cardiologie et maladies du cœur",
    icon: "❤️",
  },
  {
    id: "spec3",
    name: "Dermatologue",
    description: "Dermatologie et maladies de la peau",
    icon: "🩹",
  },
  {
    id: "spec4",
    name: "Pédiatre",
    description: "Pédiatrie et santé des enfants",
    icon: "👶",
  },
  {
    id: "spec5",
    name: "Neurologue",
    description: "Neurologie et maladies du système nerveux",
    icon: "🧠",
  },
  {
    id: "spec6",
    name: "Ophtalmologue",
    description: "Ophtalmologie et problèmes oculaires",
    icon: "👁️",
  },
];

const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: "doc1",
    name: "Dr. Ahmed Benali",
    specialty: "Médecin Généraliste",
    rating: 4.8,
    reviewCount: 156,
    location: "Alger, Algérie",
    phone: "+213 21 98 76 54",
    email: "ahmed.benali@pocketdoc.com",
    availability: "Disponible aujourd'hui",
    experience: 15,
    image: "AB",
    languages: ["Français", "Arabe", "Anglais"],
    workingHours: {
      days: "Lun-Sam",
      start: "09:00",
      end: "18:00",
    },
    slots: generateSlots(7, 30),
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc2",
    name: "Dr. Fatima Zahra Bouhadjar",
    specialty: "Cardiologue",
    rating: 4.9,
    reviewCount: 203,
    location: "Alger, Algérie",
    phone: "+213 21 87 65 43",
    email: "fatima.cardio@pocketdoc.com",
    availability: "Disponible demain",
    experience: 18,
    image: "FZ",
    languages: ["Français", "Arabe", "Anglais"],
    workingHours: {
      days: "Lun-Ven",
      start: "10:00",
      end: "17:00",
    },
    slots: generateSlots(7, 45),
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc3",
    name: "Dr. Mohammed Saïd Bendjelloul",
    specialty: "Dermatologue",
    rating: 4.7,
    reviewCount: 128,
    location: "Oran, Algérie",
    phone: "+213 41 76 54 32",
    email: "derma.said@pocketdoc.com",
    availability: "Disponible jeudi",
    experience: 12,
    image: "MS",
    languages: ["Français", "Arabe"],
    workingHours: {
      days: "Lun-Sam",
      start: "09:00",
      end: "19:00",
    },
    slots: generateSlots(7, 30),
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc4",
    name: "Dr. Leila Hamidi",
    specialty: "Pédiatre",
    rating: 4.6,
    reviewCount: 94,
    location: "Constantine, Algérie",
    phone: "+213 31 65 43 21",
    email: "pediatre.leila@pocketdoc.com",
    availability: "Disponible aujourd'hui",
    experience: 10,
    image: "LH",
    languages: ["Français", "Arabe", "Anglais"],
    workingHours: {
      days: "Lun-Ven",
      start: "08:00",
      end: "16:00",
    },
    slots: generateSlots(7, 25),
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc5",
    name: "Dr. Karim El Aziz",
    specialty: "Neurologue",
    rating: 4.5,
    reviewCount: 76,
    location: "Alger, Algérie",
    phone: "+213 21 54 32 10",
    email: "neuro.karim@pocketdoc.com",
    availability: "Disponible mercredi",
    experience: 14,
    image: "KE",
    languages: ["Français", "Arabe"],
    workingHours: {
      days: "Mar-Sam",
      start: "10:00",
      end: "18:00",
    },
    slots: generateSlots(7, 40),
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc6",
    name: "Dr. Nadia Belkacem",
    specialty: "Ophtalmologue",
    rating: 4.4,
    reviewCount: 62,
    location: "Alger, Algérie",
    phone: "+213 21 43 21 09",
    email: "ophthalmo.nadia@pocketdoc.com",
    availability: "Disponible vendredi",
    experience: 11,
    image: "NB",
    languages: ["Français", "Arabe"],
    workingHours: {
      days: "Lun-Sam",
      start: "09:30",
      end: "17:30",
    },
    slots: generateSlots(7, 35),
    createdAt: new Date().toISOString(),
  },
];

// Helper function to generate time slots
function generateSlots(days: number, duration: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startHour = 9;
  const endHour = 18;
  
  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];

    for (let hour = startHour; hour < endHour; hour += 1) {
      for (let min = 0; min < 60; min += duration) {
        slots.push({
          id: `slot-${dateStr}-${hour}-${min}`,
          date: dateStr,
          time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
          available: Math.random() > 0.3,
          duration,
        });
      }
    }
  }
  return slots;
}

// Initialize database with default data
export function initializeDatabase(): void {
  try {
    // Check if database is already initialized
    const version = localStorage.getItem(DB_VERSION_KEY);
    if (version === "1") {
      return;
    }

    // Initialize specialties
    const specialties = localStorage.getItem(SPECIALTIES_KEY);
    if (!specialties) {
      localStorage.setItem(SPECIALTIES_KEY, JSON.stringify(DEFAULT_SPECIALTIES));
    }

    // Initialize doctors
    const doctors = localStorage.getItem(DOCTORS_KEY);
    if (!doctors) {
      localStorage.setItem(DOCTORS_KEY, JSON.stringify(DEFAULT_DOCTORS));
    }

    // Initialize appointments
    const appointments = localStorage.getItem(APPOINTMENTS_KEY);
    if (!appointments) {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
    }

    // Mark database as initialized
    localStorage.setItem(DB_VERSION_KEY, "1");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

// Doctor operations
export function getAllDoctors(): Doctor[] {
  try {
    initializeDatabase();
    const data = localStorage.getItem(DOCTORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get doctors:", error);
    return [];
  }
}

export function getDoctorById(id: string): Doctor | null {
  try {
    const doctors = getAllDoctors();
    return doctors.find((d) => d.id === id) || null;
  } catch (error) {
    console.error("Failed to get doctor:", error);
    return null;
  }
}

export function getDoctorsBySpecialty(specialty: string): Doctor[] {
  try {
    const doctors = getAllDoctors();
    return doctors.filter((d) => d.specialty === specialty);
  } catch (error) {
    console.error("Failed to get doctors by specialty:", error);
    return [];
  }
}

export function saveDoctors(doctors: Doctor[]): void {
  try {
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
  } catch (error) {
    console.error("Failed to save doctors:", error);
  }
}

export function updateDoctorSlots(doctorId: string, slots: TimeSlot[]): void {
  try {
    const doctors = getAllDoctors();
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      doctor.slots = slots;
      saveDoctors(doctors);
    }
  } catch (error) {
    console.error("Failed to update doctor slots:", error);
  }
}

// Appointment operations
export function getAllAppointments(): Appointment[] {
  try {
    initializeDatabase();
    const data = localStorage.getItem(APPOINTMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get appointments:", error);
    return [];
  }
}

export function getAppointmentById(id: string): Appointment | null {
  try {
    const appointments = getAllAppointments();
    return appointments.find((a) => a.id === id) || null;
  } catch (error) {
    console.error("Failed to get appointment:", error);
    return null;
  }
}

export function getUserAppointments(patientEmail: string): Appointment[] {
  try {
    const appointments = getAllAppointments();
    return appointments.filter((a) => a.patientEmail === patientEmail);
  } catch (error) {
    console.error("Failed to get user appointments:", error);
    return [];
  }
}

export function createAppointment(appointment: Appointment): Appointment {
  try {
    const appointments = getAllAppointments();
    appointments.push(appointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    
    // Update doctor's slot availability
    updateDoctorSlots(
      appointment.doctorId,
      getDoctorById(appointment.doctorId)?.slots.map((slot) =>
        slot.date === appointment.date && slot.time === appointment.time
          ? { ...slot, available: false }
          : slot
      ) || []
    );
    
    return appointment;
  } catch (error) {
    console.error("Failed to create appointment:", error);
    throw error;
  }
}

export function cancelAppointment(appointmentId: string): boolean {
  try {
    const appointments = getAllAppointments();
    const appointment = appointments.find((a) => a.id === appointmentId);
    
    if (appointment) {
      appointment.status = "cancelled";
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
      
      // Re-open the doctor's slot
      updateDoctorSlots(
        appointment.doctorId,
        getDoctorById(appointment.doctorId)?.slots.map((slot) =>
          slot.date === appointment.date && slot.time === appointment.time
            ? { ...slot, available: true }
            : slot
        ) || []
      );
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to cancel appointment:", error);
    return false;
  }
}

export function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "completed" | "cancelled"
): boolean {
  try {
    const appointments = getAllAppointments();
    const appointment = appointments.find((a) => a.id === appointmentId);
    
    if (appointment) {
      appointment.status = status;
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to update appointment status:", error);
    return false;
  }
}

// Specialty operations
export function getAllSpecialties(): Specialty[] {
  try {
    initializeDatabase();
    const data = localStorage.getItem(SPECIALTIES_KEY);
    return data ? JSON.parse(data) : DEFAULT_SPECIALTIES;
  } catch (error) {
    console.error("Failed to get specialties:", error);
    return DEFAULT_SPECIALTIES;
  }
}

export function getSpecialtyByName(name: string): Specialty | null {
  try {
    const specialties = getAllSpecialties();
    return specialties.find((s) => s.name === name) || null;
  } catch (error) {
    console.error("Failed to get specialty:", error);
    return null;
  }
}

// Export/Import operations for backup
export function exportDatabase(): string {
  try {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      doctors: getAllDoctors(),
      appointments: getAllAppointments(),
      specialties: getAllSpecialties(),
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Failed to export database:", error);
    return "";
  }
}

export function importDatabase(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.version !== 1) {
      console.error("Invalid database version");
      return false;
    }

    if (data.doctors && Array.isArray(data.doctors)) {
      localStorage.setItem(DOCTORS_KEY, JSON.stringify(data.doctors));
    }

    if (data.appointments && Array.isArray(data.appointments)) {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(data.appointments));
    }

    if (data.specialties && Array.isArray(data.specialties)) {
      localStorage.setItem(SPECIALTIES_KEY, JSON.stringify(data.specialties));
    }

    localStorage.setItem(DB_VERSION_KEY, "1");
    return true;
  } catch (error) {
    console.error("Failed to import database:", error);
    return false;
  }
}

// Clear all data
export function clearDatabase(): void {
  try {
    localStorage.removeItem(DOCTORS_KEY);
    localStorage.removeItem(APPOINTMENTS_KEY);
    localStorage.removeItem(SPECIALTIES_KEY);
    localStorage.removeItem(DB_VERSION_KEY);
  } catch (error) {
    console.error("Failed to clear database:", error);
  }
}

// Reset to default data
export function resetToDefaults(): void {
  try {
    clearDatabase();
    initializeDatabase();
  } catch (error) {
    console.error("Failed to reset database:", error);
  }
}

// Statistics
export interface DatabaseStats {
  totalDoctors: number;
  totalAppointments: number;
  totalSpecialties: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
}

export function getDatabaseStats(): DatabaseStats {
  try {
    const doctors = getAllDoctors();
    const appointments = getAllAppointments();
    const specialties = getAllSpecialties();

    return {
      totalDoctors: doctors.length,
      totalAppointments: appointments.length,
      totalSpecialties: specialties.length,
      confirmedAppointments: appointments.filter(
        (a) => a.status === "confirmed"
      ).length,
      cancelledAppointments: appointments.filter(
        (a) => a.status === "cancelled"
      ).length,
      completedAppointments: appointments.filter(
        (a) => a.status === "completed"
      ).length,
    };
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return {
      totalDoctors: 0,
      totalAppointments: 0,
      totalSpecialties: 0,
      confirmedAppointments: 0,
      cancelledAppointments: 0,
      completedAppointments: 0,
    };
  }
}
