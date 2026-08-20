import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { Settings, Sliders, Globe, Server, Save, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();

  // App Settings
  const [appName, setAppName] = useState('CSELEC assistant');
  const [iaModel, setIaModel] = useState('Ollama (Mistral 7B)');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  // Display Settings
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('fr');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Paramètres sauvegardés avec succès');
  };

  const handleReset = () => {
    setAppName('CSELEC assistant');
    setIaModel('Ollama (Mistral 7B)');
    setChunkSize(1000);
    setChunkOverlap(200);
    setTheme('light');
    setLanguage('fr');
    showToast('info', 'Valeurs par défaut restaurées');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Paramètres du système</h2>
        <p className="text-sm text-text-secondary mt-1">Configurez l'application, l'architecture RAG et visualisez les diagnostics</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Paramètres de l'application & RAG */}
        <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-gray-50">
            <Sliders className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-text-primary text-sm">Configuration RAG & Modèle</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom de l'application</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Modèle IA Utilisé</label>
              <select
                value={iaModel}
                onChange={(e) => setIaModel(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="Ollama (Mistral 7B)">Ollama (Mistral 7B)</option>
                <option value="Ollama (Llama 3)">Ollama (Llama 3)</option>
                <option value="OpenAI (GPT-3.5-turbo)">OpenAI (GPT-3.5-turbo)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Taille des fragments (Chunk Size)</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Chevauchement (Chunk Overlap)</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        {/* Paramètres d'affichage */}
        <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-gray-50">
            <Globe className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-text-primary text-sm">Paramètres d'affichage</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Thème</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="light">Clair (Recommandé)</option>
                <option value="dark">Sombre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Langue</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="fr">Français (fr)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informations Système Diagnostics */}
        <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-gray-50">
            <Server className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-text-primary text-sm">Informations Système</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
            <div className="border border-border p-3 rounded-lg bg-gray-50">
              <div className="text-text-secondary uppercase font-semibold">Backend</div>
              <div className="text-text-primary mt-1 text-sm font-bold">FastAPI (Python 3.10)</div>
            </div>
            <div className="border border-border p-3 rounded-lg bg-gray-50">
              <div className="text-text-secondary uppercase font-semibold">Base de données</div>
              <div className="text-text-primary mt-1 text-sm font-bold">SQLite 3</div>
            </div>
            <div className="border border-border p-3 rounded-lg bg-gray-50">
              <div className="text-text-secondary uppercase font-semibold">Base vectorielle</div>
              <div className="text-text-primary mt-1 text-sm font-bold">ChromaDB</div>
            </div>
            <div className="border border-border p-3 rounded-lg bg-gray-50">
              <div className="text-text-secondary uppercase font-semibold">Embeddings</div>
              <div className="text-text-primary mt-1 text-sm font-bold">SentenceTransformer</div>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold text-text-primary hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Enregistrer
          </button>
        </div>

      </form>
    </div>
  );
}
