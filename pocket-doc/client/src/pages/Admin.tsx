import { useEffect, useState } from "react";
import { Loader2, LogOut, Users, Settings, FileText, BarChart3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  activeUsers: number;
}

export default function Admin() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Fetch admin data
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      
      const [statsResponse, usersResponse] = await Promise.all([
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsResponse.ok || !usersResponse.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const statsData = await statsResponse.json();
      const usersData = await usersResponse.json();

      setStats(statsData);
      setUsers(usersData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de chargement";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    toast.success("Déconnexion réussie");
    window.location.href = "/login";
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-indigo-900 text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        <div className="p-4 flex items-center justify-between">
          <div className={`${!sidebarOpen && "hidden"} text-2xl font-bold`}>✳</div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-indigo-800 p-1 rounded"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2">
          <SidebarItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Tableau de bord"
            collapsed={!sidebarOpen}
          />
          <SidebarItem
            icon={<Users className="h-5 w-5" />}
            label="Utilisateurs"
            collapsed={!sidebarOpen}
          />
          <SidebarItem
            icon={<FileText className="h-5 w-5" />}
            label="Documents"
            collapsed={!sidebarOpen}
          />
          <SidebarItem
            icon={<Settings className="h-5 w-5" />}
            label="Paramètres"
            collapsed={!sidebarOpen}
          />
        </nav>

        <div className="p-3 border-t border-indigo-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-indigo-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className={!sidebarOpen ? "hidden" : ""}>Déconnexion</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Admin</h1>
            <p className="text-gray-600">Bienvenue sur le panneau d'administration Pocket Doc</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white border-b">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Utilisateurs totaux
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-indigo-600">
                      {stats?.totalUsers || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Tous les utilisateurs enregistrés</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {stats?.totalDocuments || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Documents créés</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Utilisateurs actifs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {stats?.activeUsers || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Les 30 derniers jours</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                  <CardDescription>
                    Les actions les plus récentes dans le système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Aucune activité récente
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <CardDescription>
                    Liste de tous les utilisateurs enregistrés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Nom
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Rôle
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Date de création
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length > 0 ? (
                          users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">{user.email}</td>
                              <td className="py-3 px-4">{user.name}</td>
                              <td className="py-3 px-4">
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-indigo-600 hover:text-indigo-700"
                                >
                                  Modifier
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500">
                              Aucun utilisateur trouvé
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de l'application</CardTitle>
                  <CardDescription>
                    Configurez les paramètres généraux du système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom de l'application
                      </label>
                      <input
                        type="text"
                        defaultValue="Pocket Doc"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email de support
                      </label>
                      <input
                        type="email"
                        defaultValue="support@pocketdoc.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      Enregistrer les paramètres
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

function SidebarItem({ icon, label, collapsed }: SidebarItemProps) {
  return (
    <button className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-indigo-800 transition-colors">
      {icon}
      <span className={`ml-3 ${collapsed && "hidden"}`}>{label}</span>
    </button>
  );
}
