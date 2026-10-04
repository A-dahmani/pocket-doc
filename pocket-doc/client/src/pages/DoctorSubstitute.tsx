import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope,
  Activity,
  Pill,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const consultationSchema = z.object({
  patientName: z.string().min(2, "Nom du patient requis"),
  age: z.string().min(1, "Âge requis"),
  symptoms: z.string().min(10, "Décrivez les symptômes en détail"),
  duration: z.string().min(1, "Durée requise"),
  severity: z.enum(["mild", "moderate", "severe"]),
  medicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  allergies: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

interface Consultation {
  id: string;
  patientName: string;
  date: string;
  diagnosis: string;
  recommendations: string[];
  status: "pending" | "in_progress" | "completed";
}

interface DoctorSubstitute {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
  nextAvailable: string;
}

export default function DoctorSubstitute() {
  const [isLoading, setIsLoading] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [substituteDoctors, setSubstituteDoctors] = useState<DoctorSubstitute[]>(
    [
      {
        id: "1",
        name: "Dr. Ahmed Benali",
        specialty: "Médecin Généraliste",
        available: true,
        nextAvailable: "Aujourd'hui",
      },
      {
        id: "2",
        name: "Dr. Fatima Zahra",
        specialty: "Cardiologue",
        available: true,
        nextAvailable: "Demain",
      },
      {
        id: "3",
        name: "Dr. Mohammed Saïd",
        specialty: "Dermatologue",
        available: false,
        nextAvailable: "Jeudi",
      },
    ]
  );
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      patientName: "",
      age: "",
      symptoms: "",
      duration: "",
      severity: "moderate",
      medicalHistory: "",
      currentMedications: "",
      allergies: "",
    },
  });

  async function onSubmitConsultation(data: ConsultationFormData) {
    setIsLoading(true);
    try {
      // Simulated AI diagnosis
      const newConsultation: Consultation = {
        id: `consult-${Date.now()}`,
        patientName: data.patientName,
        date: new Date().toISOString(),
        diagnosis:
          "Sur la base des symptômes rapportés, une infection virale bénigne est suspectée. Recommandation : repos, hydratation abondante et observation.",
        recommendations: [
          "Repos minimum 48 heures",
          "Boire 2-3 litres d'eau par jour",
          "Prendre du paracétamol 500mg si fièvre",
          "Consulter un médecin si aggravation",
          "Éviter le contact avec d'autres personnes",
        ],
        status: "completed",
      };

      setConsultations([newConsultation, ...consultations]);
      toast.success("Consultation créée avec succès");
      form.reset();
    } catch (error) {
      toast.error("Erreur lors de la création de la consultation");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Stethoscope className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Remplaçant du Médecin
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Consultations virtuelles et diagnostic assisté par IA
          </p>
        </div>

        <Tabs defaultValue="consultation" className="space-y-6">
          <TabsList className="bg-white border-b">
            <TabsTrigger value="consultation">Nouvelle Consultation</TabsTrigger>
            <TabsTrigger value="substitutes">Médecins Remplaçants</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Nouvelle Consultation */}
          <TabsContent value="consultation">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Formulaire de Consultation</CardTitle>
                    <CardDescription>
                      Remplissez les informations du patient pour une consultation virtuelle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmitConsultation)}
                        className="space-y-6"
                      >
                        {/* Patient Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="patientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom du patient</FormLabel>
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
                          <FormField
                            control={form.control}
                            name="age"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Âge</FormLabel>
                                <FormControl>
                                  <input
                                    type="number"
                                    placeholder="35"
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

                        {/* Symptoms */}
                        <FormField
                          control={form.control}
                          name="symptoms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Symptômes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Décrivez les symptômes détaillés du patient..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Duration and Severity */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée des symptômes</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="less_24h">
                                        Moins de 24h
                                      </SelectItem>
                                      <SelectItem value="1_3_days">
                                        1-3 jours
                                      </SelectItem>
                                      <SelectItem value="1_week">
                                        1 semaine
                                      </SelectItem>
                                      <SelectItem value="more_week">
                                        Plus d'une semaine
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="severity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gravité</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mild">Légère</SelectItem>
                                      <SelectItem value="moderate">
                                        Modérée
                                      </SelectItem>
                                      <SelectItem value="severe">
                                        Grave
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Medical History */}
                        <FormField
                          control={form.control}
                          name="medicalHistory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Antécédents médicaux (optionnel)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Maladies chroniques, allergies, interventions..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Current Medications */}
                        <FormField
                          control={form.control}
                          name="currentMedications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Médicaments actuels (optionnel)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Liste des médicaments avec dosage..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Allergies */}
                        <FormField
                          control={form.control}
                          name="allergies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allergies (optionnel)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Allergies médicamenteuses ou autres..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyse en cours...
                            </>
                          ) : (
                            <>
                              <Stethoscope className="mr-2 h-4 w-4" />
                              Démarrer la consultation
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Info Cards */}
              <div className="space-y-4">
                <Card className="bg-indigo-50 border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-indigo-600" />
                      Important
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700">
                    Ce système est conçu pour assister et non remplacer un vrai
                    médecin. En cas d'urgence, contactez les services d'urgence.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Étapes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Remplir le formulaire</span>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm">Analyse IA en cours</span>
                    </div>
                    <div className="flex gap-3">
                      <Activity className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm">Diagnostic et recommandations</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Médecins Remplaçants */}
          <TabsContent value="substitutes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {substituteDoctors.map((doctor) => (
                <Card key={doctor.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                        <CardDescription>{doctor.specialty}</CardDescription>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          doctor.available
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {doctor.available ? "Disponible" : "Indisponible"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {doctor.nextAvailable}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!doctor.available}
                      variant={doctor.available ? "default" : "outline"}
                    >
                      {doctor.available ? "Prendre RDV" : "Non disponible"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Historique */}
          <TabsContent value="history">
            {consultations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Aucune consultation enregistrée
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <Card
                    key={consultation.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {consultation.patientName}
                          </CardTitle>
                          <CardDescription>
                            {new Date(consultation.date).toLocaleDateString(
                              "fr-FR"
                            )}
                          </CardDescription>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            consultation.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {consultation.status === "completed"
                            ? "Complétée"
                            : "En cours"}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        {consultation.diagnosis}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConsultation(consultation)}
                      >
                        Voir détails
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Détail de la consultation */}
            {selectedConsultation && (
              <Card className="mt-6 border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Détails de la consultation</CardTitle>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedConsultation(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Diagnostic:
                    </h3>
                    <p className="text-gray-700">
                      {selectedConsultation.diagnosis}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Recommandations:
                    </h3>
                    <ul className="space-y-2">
                      {selectedConsultation.recommendations.map(
                        (rec, index) => (
                          <li
                            key={index}
                            className="flex gap-3 text-gray-700"
                          >
                            <Pill className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
