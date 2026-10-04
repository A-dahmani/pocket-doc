import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  Star,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllDoctors,
  getDoctorsBySpecialty,
  getDoctorById,
  getAllAppointments,
  getUserAppointments,
  createAppointment,
  cancelAppointment,
  getAllSpecialties,
  initializeDatabase,
  type Doctor,
  type Appointment,
} from "@/lib/doctorDatabase";

// Validation schemas
const appointmentSchema = z.object({
  doctorId: z.string().min(1, "Sélectionnez un médecin"),
  date: z.string().min(1, "Sélectionnez une date"),
  time: z.string().min(1, "Sélectionnez une heure"),
  patientName: z.string().min(2, "Nom requis"),
  patientEmail: z.string().email("Email invalide"),
  patientPhone: z.string().min(10, "Téléphone invalide"),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function DoctorAppointment() {
  // Initialize database on mount
  useEffect(() => {
    initializeDatabase();
  }, []);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctorId: selectedDoctor?.id || "",
      date: "",
      time: "",
      patientName: "",
      patientEmail: "",
      patientPhone: "",
      notes: "",
    },
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const allDoctors = getAllDoctors();
    setDoctors(allDoctors);
    
    const allAppointments = getAllAppointments();
    setAppointments(allAppointments);

    // Get user email from localStorage if available
    const email = localStorage.getItem("userEmail") || "";
    setUserEmail(email);
  }, []);

  // Get unique specialties
  const specialties = useMemo(() => {
    const specs = getAllSpecialties();
    return ["all", ...specs.map((s) => s.name)];
  }, []);

  // Filter doctors by specialty and search
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSpecialty =
        selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
      const matchesSearch =
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSpecialty && matchesSearch;
    });
  }, [doctors, selectedSpecialty, searchQuery]);

  // Available slots for selected doctor and date
  const availableSlots = useMemo(() => {
    if (!selectedDoctor || !form.watch("date")) return [];
    return selectedDoctor.slots.filter(
      (slot) => slot.date === form.watch("date") && slot.available
    );
  }, [selectedDoctor, form.watch("date")]);

  // User's appointments
  const userAppointments = useMemo(() => {
    return userEmail ? getUserAppointments(userEmail) : appointments;
  }, [userEmail, appointments]);

  async function onSubmitAppointment(data: AppointmentFormData) {
    setIsLoading(true);
    try {
      if (!selectedDoctor) throw new Error("Médecin non sélectionné");

      const newAppointment: Appointment = {
        id: `apt-${Date.now()}`,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        date: data.date,
        time: data.time,
        duration: selectedDoctor.slots.find((s) => s.time === data.time)?.duration || 30,
        status: "confirmed",
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        patientPhone: data.patientPhone,
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      createAppointment(newAppointment);
      
      // Update local state
      setAppointments([newAppointment, ...appointments]);
      
      // Update user email if provided
      if (data.patientEmail) {
        localStorage.setItem("userEmail", data.patientEmail);
        setUserEmail(data.patientEmail);
      }

      toast.success(`Rendez-vous confirmé avec ${selectedDoctor.name}`);
      
      form.reset();
      setIsBookingOpen(false);
      setSelectedDoctor(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la réservation";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    form.setValue("doctorId", doctor.id);
    setIsBookingOpen(true);
  }

  function handleCancelAppointment(appointmentId: string) {
    const success = cancelAppointment(appointmentId);
    if (success) {
      const updated = appointments.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: "cancelled" } : apt
      );
      setAppointments(updated);
      toast.success("Rendez-vous annulé");
      setSelectedAppointment(null);
    } else {
      toast.error("Erreur lors de l'annulation");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Système de Rendez-vous Médical
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Trouvez et réservez votre rendez-vous avec des médecins spécialisés
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white border-b">
            <TabsTrigger value="search">Chercher un Médecin</TabsTrigger>
            <TabsTrigger value="appointments">Mes Rendez-vous</TabsTrigger>
          </TabsList>

          {/* Search and Book */}
          <TabsContent value="search" className="space-y-6">
            {/* Search Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Rechercher un Médecin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, spécialité ou localisation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Specialty Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spécialité
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {specialties.map((specialty) => (
                        <button
                          key={specialty}
                          onClick={() => setSelectedSpecialty(specialty)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            selectedSpecialty === specialty
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {specialty === "all" ? "Tous" : specialty}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-600">
                    {filteredDoctors.length} médecin(s) trouvé(s)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Doctors List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                          {doctor.image}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{doctor.name}</CardTitle>
                          <CardDescription className="text-indigo-600 font-medium">
                            {doctor.specialty}
                          </CardDescription>
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{doctor.rating}</span>
                      <span className="text-sm text-gray-500">
                        ({doctor.reviewCount} avis)
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{doctor.location}</span>
                    </div>

                    {/* Experience */}
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {doctor.experience} ans d'expérience
                      </span>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {doctor.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {doctor.email}
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {doctor.workingHours.days} • {doctor.workingHours.start}-
                      {doctor.workingHours.end}
                    </div>

                    {/* Languages */}
                    <div className="flex flex-wrap gap-1">
                      {doctor.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>

                    {/* Availability Badge */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {doctor.availability}
                      </div>
                    </div>

                    {/* Book Button */}
                    <Button
                      onClick={() => handleSelectDoctor(doctor)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Prendre RDV
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDoctors.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Aucun médecin trouvé avec ces critères
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Appointments */}
          <TabsContent value="appointments" className="space-y-6">
            {userAppointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun rendez-vous enregistré</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userAppointments.map((appointment) => (
                  <Card
                    key={appointment.id}
                    className={`cursor-pointer hover:shadow-lg transition ${
                      appointment.status === "cancelled"
                        ? "opacity-60 bg-gray-50"
                        : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {appointment.doctorName}
                          </CardTitle>
                          <CardDescription className="text-indigo-600">
                            {appointment.specialty}
                          </CardDescription>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : appointment.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {appointment.status === "confirmed"
                            ? "Confirmé"
                            : appointment.status === "completed"
                            ? "Complété"
                            : "Annulé"}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(`${appointment.date}T${appointment.time}`)
                              .toLocaleDateString("fr-FR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {appointment.time} ({appointment.duration} min)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Patient</div>
                          <div className="text-sm font-medium">
                            {appointment.patientName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {appointment.patientPhone}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Email</div>
                          <div className="text-sm text-gray-700">
                            {appointment.patientEmail}
                          </div>
                        </div>
                      </div>

                      {appointment.notes && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Notes</div>
                          <div className="text-sm text-gray-700">
                            {appointment.notes}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          Voir détails
                        </Button>
                        {appointment.status === "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancelAppointment(appointment.id)}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Appointment Details Modal */}
            {selectedAppointment && (
              <Card className="border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Détails du Rendez-vous</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAppointment(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Informations Médicales
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Médecin:</span>
                          <p className="font-medium">
                            {selectedAppointment.doctorName}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Spécialité:</span>
                          <p className="font-medium">
                            {selectedAppointment.specialty}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Horaires
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium">
                            {new Date(`${selectedAppointment.date}T${selectedAppointment.time}`)
                              .toLocaleDateString("fr-FR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Heure:</span>
                          <p className="font-medium">
                            {selectedAppointment.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Réserver un Rendez-vous</DialogTitle>
            <DialogDescription>
              {selectedDoctor
                ? `Avec ${selectedDoctor.name} - ${selectedDoctor.specialty}`
                : "Veuillez sélectionner un médecin"}
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitAppointment)}
                className="space-y-6"
              >
                {/* Date and Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une date" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...new Set(selectedDoctor.slots.map((s) => s.date))]
                                .sort()
                                .map((date) => (
                                  <SelectItem key={date} value={date}>
                                    {new Date(`${date}T12:00:00`).toLocaleDateString(
                                      "fr-FR",
                                      {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une heure" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSlots.map((slot) => (
                                <SelectItem key={slot.id} value={slot.time}>
                                  {slot.time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Patient Info */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Informations du Patient</h3>

                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="Jean Dupont"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="patientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <input
                              type="email"
                              placeholder="jean@example.com"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <input
                              type="tel"
                              placeholder="+213 21 98 76 54"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optionnel)</FormLabel>
                        <FormControl>
                          <textarea
                            placeholder="Informations supplémentaires pour le médecin..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    Un email de confirmation sera envoyé à votre adresse email.
                    Assurez-vous que vos informations sont correctes.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBookingOpen(false)}
                    disabled={isLoading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Réservation en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirmer le Rendez-vous
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
