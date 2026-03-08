'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);

    const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
    const minutosRestantes = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 60000) : 0;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;

        if (!username.trim() || !password.trim()) {
            setError('Ingresa tu usuario y contraseña.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.login(username.trim(), password);
            // ✓ Login exitoso — tokens guardados en sessionStorage por api.login()
            router.replace('/admin');
        } catch (err: any) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= MAX_ATTEMPTS) {
                setLockedUntil(Date.now() + LOCKOUT_MS);
                setError('Demasiados intentos fallidos. Bloqueado por 15 minutos.');
            } else {
                const restantes = MAX_ATTEMPTS - newAttempts;
                setError(
                    `${err.message} · ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.`
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9E4E4] via-[#FDF8F6] to-[#F5E6D3] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#D4A574] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#D4A574]/30">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-[#4A3F32]">Yalinnette Hair & Beauty Artist</h1>
                    <p className="text-[#8B7355] text-sm mt-1">Panel de Administración</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl p-7 border border-rose-100">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-4 h-4 text-[#D4A574]" />
                        <h2 className="font-semibold text-[#4A3F32]">Iniciar sesión</h2>
                    </div>

                    {/* Aviso de bloqueo */}
                    {isLocked && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm">
                                Cuenta bloqueada por demasiados intentos fallidos.<br />
                                Intenta de nuevo en <strong>{minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''}</strong>.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">

                        {/* Usuario */}
                        <div>
                            <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                placeholder="admin"
                                disabled={isLocked}
                                autoComplete="username"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    disabled={isLocked}
                                    autoComplete="current-password"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white disabled:opacity-50 transition-shadow"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Mensaje de error */}
                        {error && !isLocked && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Barra de intentos restantes */}
                        {attempts > 0 && !isLocked && (
                            <div className="flex gap-1" title={`${attempts} de ${MAX_ATTEMPTS} intentos usados`}>
                                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-colors duration-300
                      ${i < attempts ? 'bg-red-400' : 'bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Botón */}
                        <button
                            type="submit"
                            disabled={loading || isLocked}
                            className="w-full bg-[#D4A574] hover:bg-[#C4956A] active:bg-[#B5855A] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#D4A574]/30"
                        >
                            {loading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                                : <><Lock className="w-4 h-4" /> Ingresar</>
                            }
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Autenticación JWT · Sesión de 8 horas
                    </p>
                </div>
            </div>
        </div>
    );
}