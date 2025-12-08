// src/app/services/[serviceId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CRMLayout from "@/components/CRMLayout";
import { getServiceById } from "../../../lib/service-config";
import { clientManager } from "../../../lib/client-config";
import { MultiServiceManager } from "../../../lib/multi-service-utils";
import { Client } from "../../../types/client";

export default function ServiceDashboard() {
  const params = useParams();
  const { status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  const serviceId = params.serviceId as string;
  const service = getServiceById(serviceId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (service) {
      MultiServiceManager.getClientsForService(serviceId).then((serviceClients) => {
        setClients(serviceClients);
      });
    }
  }, [serviceId, service]);

  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING SERVICE...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (!service) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
              SERVICE NOT FOUND
            </h1>
            <p className="text-medium-grey mb-4 font-space-grotesk">
              THE SERVICE YOU'RE LOOKING FOR DOESN'T EXIST.
            </p>
            <Button
              className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              onClick={() => router.push("/dashboard")}
            >
              ← BACK TO DASHBOARD
            </Button>
          </div>
        </div>
      </CRMLayout>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active").length;
  const prospects = clients.filter((c) => c.status === "prospect").length;
  // const completedProjects = clients.filter(
  //   (c) => c.status === "completed",
  // ).length;
  const totalRevenue = clients.reduce(
    (sum, client) => sum + (client.budget || 0),
    0,
  );

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="neo-container p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 flex items-center justify-center text-white font-bold font-primary rounded-lg"
                  style={{ backgroundColor: service.brand.primaryColor }}
                >
                  {service.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground uppercase tracking-wide font-primary mb-2">
                    {service.name.toUpperCase()}
                  </h1>
                  <p className="text-muted-foreground font-primary uppercase tracking-wide text-sm">
                    {service.description?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                className="neo-button font-primary font-bold uppercase tracking-wide text-sm"
                onClick={() => router.push(`/clients/new?serviceId=${serviceId}`)}
              >
                ADD {service.businessType?.toUpperCase()} CLIENT
              </Button>
              <Button
                className="neo-button font-primary font-bold uppercase tracking-wide text-sm"
                onClick={() => window.open(`https://${service.domain}`, '_blank')}
              >
                VISIT {service.domain?.toUpperCase()} ↗
              </Button>
            </div>
          </div>
        </div>

        {/* Service Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="neo-container p-4">
            <div className="text-2xl font-bold text-foreground font-primary">
              {clients.length}
            </div>
            <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
              TOTAL CLIENTS
            </div>
          </div>

          <div className="neo-container p-4">
            <div className="text-2xl font-bold text-green-600 font-primary">
              {activeClients}
            </div>
            <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
              ACTIVE PROJECTS
            </div>
          </div>

          <div className="neo-container p-4">
            <div className="text-2xl font-bold text-foreground font-primary">
              {prospects}
            </div>
            <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
              PROSPECTS
            </div>
          </div>

          <div className="neo-container p-4">
            <div className="text-2xl font-bold text-green-600 font-primary">
              ${totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
              PIPELINE VALUE
            </div>
          </div>
        </div>

        {/* Service-Specific Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 font-primary uppercase tracking-wide">
            {service.businessType?.toUpperCase()} SERVICES
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {service.serviceTypes.map((serviceType, index) => {
              const typeClients = clients.filter((c) =>
                c.serviceTypes.includes(serviceType.name),
              );
              return (
                <div
                  key={index}
                  className="neo-container p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer relative overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: service.brand.primaryColor }}
                  />
                  <div className="font-bold text-foreground font-primary uppercase tracking-wide text-sm">
                    {serviceType.name.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 font-primary">
                    {typeClients.length} CLIENTS
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 font-primary">
                    ${typeClients
                      .reduce((sum, c) => sum + (c.budget || 0), 0)
                      .toLocaleString()} VALUE
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Clients for This Service */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide">
              {service.businessType?.toUpperCase()} CLIENTS
            </h2>
            <Button
              className="neo-button-sm font-primary font-bold uppercase tracking-wide text-sm"
              onClick={() => router.push(`/clients?service=${serviceId}`)}
            >
              VIEW ALL →
            </Button>
          </div>

          {clients.length === 0 ? (
            <div className="neo-container p-8 text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                NO {service.businessType?.toUpperCase()} CLIENTS YET
              </h3>
              <p className="text-muted-foreground mb-4 font-primary">
                START BUILDING YOUR {service.businessType?.toUpperCase()} CLIENT BASE TO TRACK PROJECTS AND RELATIONSHIPS.
              </p>
              <Button
                className="neo-button font-primary font-bold uppercase tracking-wide"
                onClick={() => router.push(`/clients/new?serviceId=${serviceId}`)}
              >
                ADD YOUR FIRST {service.businessType?.toUpperCase()} CLIENT
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                )
                .slice(0, 6)
                .map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="block"
                  >
                    <div
                      className="neo-container p-4 hover:scale-[1.02] transition-all duration-200 relative overflow-hidden"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: service.brand.primaryColor }}
                      />
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-foreground font-primary">
                            {client.name?.toUpperCase()}
                          </h3>
                          {client.company && (
                            <div className="text-sm text-muted-foreground font-primary">
                              {client.company.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-bold uppercase font-primary rounded ${
                            client.status === "active"
                              ? "bg-green-600 text-white"
                              : client.status === "prospect"
                                ? "neo-inset text-foreground"
                                : client.status === "completed"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-600 text-white"
                          }`}
                        >
                          {client.status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1 font-primary">
                        <div>📧 {client.email?.toUpperCase()}</div>
                        {client.projectType && <div>🏗️ {client.projectType.toUpperCase()}</div>}
                        {client.serviceTypes.length > 0 && (
                          <div>
                            🔧 {client.serviceTypes.slice(0, 2).join(", ").toUpperCase()}
                          </div>
                        )}
                        {client.budget && (
                          <div>💰 ${client.budget.toLocaleString()}</div>
                        )}
                        {client.address && (
                          <div>
                            📍 {client.address.city?.toUpperCase()}, {client.address.state?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground font-primary uppercase tracking-wide">
                        UPDATED: {new Date(client.updatedAt).toLocaleDateString().toUpperCase()}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
