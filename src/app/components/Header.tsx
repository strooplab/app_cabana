"use client";
import React from "react";
import { Smartphone, LogOut, Shield, User, Activity } from "lucide-react";

interface HeaderProps {
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="p-2 card-header-primary rounded-xl shadow-lg">
                <Smartphone className="h-9 w-9 text-white flex items-center justify-center" />
              </div>
              {/* Active indicator */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Descarga y actualiza tu app campo
              </h1>
              <p className="text-sm text-gray-500 font-medium flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                Seguro
              </p>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  Online
                </span>
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              {/* User avatar */}
              <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              
              {/* Logout button */}
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group border border-transparent hover:border-red-200"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden sm:inline text-sm font-medium">
                  Salir
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile status indicator */}
        <div className="sm:hidden mt-3 flex justify-center">
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">
              Sesión activa
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;