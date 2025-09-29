"use client";
import React, { useState } from "react";
import { Shield, Eye, EyeOff } from "lucide-react"; // Iconos

interface AuthFormProps { // Parámetros establecidos desde la página principal
  onAuth: (password: string) => Promise<void>;
  loading: boolean;
  error: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuth, loading, error }) => {
  const [password, setPassword] = useState<string>(""); // Inicialización de las variables
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) { // Verificación de la contraseña
      await onAuth(password);
    }
  };

  // Frontend AuthForm
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="card hover-lift">
          {/* Header */}
          <div className="h-full card-header-primary items-center justify-center p-2">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-white/20 rounded-full mr-6">
                <Shield className="h-10 w-10 text-white flex items-center justify-center" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Acceso Seguro</h1>
                <p className="text-stone-50 text-sm mt-1">
                  Distribución Interna de App (CAMPO)
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-3"
                >
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-5 pr-12 h-12 mb-5"
                    placeholder="Ingresa tu contraseña"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-slideInRight">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="btn-primary w-full h-12 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div> {/* Spinner de carga */}
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-8 w-8" />
                    <span className="text-base">Acceder</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-black/80 text-sm">
            Distribución de app de campo y archivos de actualización • Versión 2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;