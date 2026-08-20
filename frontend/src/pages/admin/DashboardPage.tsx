import React, { useState, useEffect } from 'react';
import { statsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { DashboardStats } from '../../types';
import { Users, FileText, MessageSquare, ShieldAlert, Loader2, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await statsApi.dashboard();
      setStats(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-text-secondary gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm">Chargement des données du tableau de bord...</span>
      </div>
    );
  }

  // Calculate percentages / max count for nice visual bars
  const maxConvCount = Math.max(...stats.conversations_by_date.map(c => c.count), 1);
  const totalDocs = stats.total_documents || 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Tableau de bord</h2>
        <p className="text-sm text-text-secondary mt-1">
          Aperçu global de l'utilisation de l'application et de la base documentaire
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{stats.total_users}</div>
            <div className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-0.5">Utilisateurs</div>
          </div>
        </div>

        {/* Technicians */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{stats.total_technicians}</div>
            <div className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-0.5">Techniciens</div>
          </div>
        </div>

        {/* Conversations */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{stats.total_conversations}</div>
            <div className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-0.5">Conversations</div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{stats.total_documents}</div>
            <div className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-0.5">Documents PDF</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations Activity Chart (HTML/CSS Bar Chart) */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs lg:col-span-2 flex flex-col h-80">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4.5 h-4.5 text-primary-500" />
            <h3 className="font-semibold text-text-primary text-sm">Activité des conversations</h3>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2.5 pt-4">
            {stats.conversations_by_date.map((day, idx) => {
              const heightPct = (day.count / maxConvCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="relative w-full flex items-end justify-center h-full">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
                      {day.count} {day.count > 1 ? 'convs' : 'conv'}
                    </div>
                    <div
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                      className="w-full sm:w-10 bg-primary-500 hover:bg-primary-600 rounded-t-sm transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary font-semibold">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents by Category Breakdown */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-col h-80">
          <h3 className="font-semibold text-text-primary text-sm mb-4">Documents par catégorie</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {stats.documents_by_category.length === 0 ? (
              <div className="text-center text-xs text-text-secondary pt-16">
                Aucun document n'a encore été classé.
              </div>
            ) : (
              stats.documents_by_category.map((cat, idx) => {
                const percentage = (cat.count / totalDocs) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-text-primary">{cat.categorie}</span>
                      <span className="text-text-secondary">
                        {cat.count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-primary-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
